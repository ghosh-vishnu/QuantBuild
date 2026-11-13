import { useEffect, useRef, useState } from 'react';
import { Hash, MessageCircle, Plus, Send, Users, X, Trash2, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../auth/AuthContext';
import { useProject } from '../projects/Projects';
import { useApi, useAction } from '../../lib/query';
import { api, notify, rows, stamp, type Row } from '../../lib/api';
import { Avatar, Badge, Button, Empty, Fields, Modal, QueryView } from '../../components/ui';
import { useChatSocket } from './useChatSocket';
function mergeMessages(old: Row[], incoming: Row[]) {
  const data = new Map(old.map((m) => [m.id, m]));
  incoming.forEach((m) => data.set(m.id, m));
  return [...data.values()].sort((a, b) => a.id - b.id);
}
export default function Chat() {
  const { project, summary } = useProject();
  const { session } = useAuth();
  const owner = summary.access?.is_owner;
  const client = useQueryClient();
  const groups = useApi(`/api/v1/projects/${project.id}/chat/groups/`, true, 15000);
  const [groupId, setGroupId] = useState<number | undefined>();
  const [modal, setModal] = useState<'create' | 'members' | null>(null);
  const [text, setText] = useState('');
  const [messages, setMessages] = useState<Row[]>([]);
  const [pending, setPending] = useState<Row[]>([]);
  const [older, setOlder] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);
  const selected = rows(groups.data).find((g) => g.id === groupId);
  const url = `/api/v1/projects/${project.id}/chat/groups/${groupId}/messages/`;
  const history = useApi(url, !!selected, 15000);
  const members = useApi(
    `/api/v1/projects/${project.id}/chat/groups/${groupId}/members/`,
    !!selected,
  );
  const team = useApi(`/api/v1/projects/${project.id}/team/`);
  useEffect(() => {
    const list = rows(groups.data);
    if (!list.some((g) => g.id === groupId)) setGroupId(list[0]?.id);
  }, [groups.data, groupId]);
  useEffect(() => {
    setMessages([]);
    setPending([]);
    setText('');
    setOlder(null);
    stickBottom.current = true;
  }, [project.id, groupId]);
  const accept = (message: Row) => {
    if (message.group_id !== groupId) return;
    setMessages((old) => mergeMessages(old, [message]));
    setPending((old) =>
      old.filter(
        (m) =>
          m.client_message_id !== message.client_message_id ||
          message.sender.id !== session?.user.id,
      ),
    );
  };
  const socket = useChatSocket(project.id, selected?.id, (event) => {
    if (['message.created', 'message.ack'].includes(event.type)) accept(event.message);
    if (event.type === 'group.members_changed') members.refetch();
    if (event.type === 'access.denied') {
      groups.refetch();
      members.refetch();
      history.refetch();
    }
    if (event.type === 'error') {
      notify(
        typeof event.detail === 'string'
          ? event.detail
          : 'Message could not be sent. Check the message and try again.',
        'error',
      );
      setPending((old) => old.map((m) => ({ ...m, failed: true })));
    }
  });
  useEffect(() => {
    if (history.data?.messages) {
      const incoming = history.data.messages.filter((m: Row) => m.group_id === groupId);
      setMessages((old) => mergeMessages(old, incoming));
      setOlder(history.data.next_before_id);
      setPending((old) =>
        old.filter(
          (p) =>
            !incoming.some(
              (m: Row) =>
                m.client_message_id === p.client_message_id && m.sender.id === session?.user.id,
            ),
        ),
      );
    }
  }, [history.data, groupId, session?.user.id]);
  useEffect(() => {
    if (stickBottom.current)
      bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages.length, pending.length]);
  async function sendMessage(payload: Row) {
    if (socket.send({ type: 'message.send', ...payload })) return;
    try {
      accept(await api(url, 'POST', payload));
    } catch (error) {
      notify((error as Error).message, 'error');
      setPending((old) =>
        old.map((p) =>
          p.client_message_id === payload.client_message_id ? { ...p, failed: true } : p,
        ),
      );
    }
  }
  function submit() {
    if (!text.trim() || !selected) return;
    const payload = {
      client_message_id: crypto.randomUUID(),
      text: text.trim(),
    };
    setPending((old) => [...old, { ...payload, failed: false }]);
    setText('');
    sendMessage(payload);
  }
  async function more() {
    stickBottom.current = false;
    setLoadingOlder(true);
    try {
      const data = await api(`${url}?before_id=${older}`);
      setMessages((old) => mergeMessages(old, data.messages));
      setOlder(data.next_before_id);
    } catch (error) {
      notify((error as Error).message, 'error');
    } finally {
      setLoadingOlder(false);
    }
  }
  const remove = useAction(
    (userId: number) =>
      api(`/api/v1/projects/${project.id}/chat/groups/${groupId}/members/${userId}/`, 'DELETE'),
    undefined,
    'Group member removed.',
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>A conversation for every build.</h2>
          <p className="muted">Project conversations stay with the project.</p>
        </div>
        {owner && (
          <Button onClick={() => setModal('create')}>
            <Plus size={16} /> New group
          </Button>
        )}
      </div>
      <QueryView query={groups}>
        {rows(groups.data).length ? (
          <div className="chat-layout card">
            <aside className="chat-sidebar">
              <div className="chat-sidebar-heading">
                <strong>Project groups</strong>
                <Badge>{rows(groups.data).length}</Badge>
              </div>
              {rows(groups.data).map((group) => (
                <button
                  key={group.id}
                  onClick={() => setGroupId(group.id)}
                  className={`chat-group ${group.id === groupId ? 'selected' : ''}`}
                >
                  <span className="chat-group-icon">
                    <Hash size={20} />
                  </span>
                  <div>
                    <strong>{group.name}</strong>
                    <small>{group.member_count} members</small>
                  </div>
                </button>
              ))}
            </aside>
            <section className="chat-main">
              <header className="chat-header">
                <span className="chat-group-icon">
                  <Hash size={21} />
                </span>
                <div>
                  <h3>{selected?.name}</h3>
                  <small className={`connection-status ${socket.status === 'Live' ? 'live' : ''}`}>
                    <i />
                    {socket.status}
                  </small>
                </div>
                <button className="btn secondary small" onClick={() => setModal('members')}>
                  <Users size={15} />
                  Members
                </button>
              </header>
              <div
                className="message-list"
                role="log"
                aria-label="Project messages"
                aria-live="polite"
                onScroll={(event) => {
                  const target = event.currentTarget;
                  stickBottom.current =
                    target.scrollHeight - target.scrollTop - target.clientHeight < 100;
                }}
              >
                {older && (
                  <Button
                    busy={loadingOlder}
                    className="secondary small older-button"
                    onClick={more}
                  >
                    Load earlier messages
                  </Button>
                )}
                {!messages.length && !history.isPending && (
                  <Empty
                    title="Start the conversation"
                    text="Share an update, ask a question or say hello to your project team."
                  />
                )}
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message-row ${message.sender.id === session?.user.id ? 'mine' : ''}`}
                  >
                    <Avatar name={message.sender.name || message.sender.email} size="small" />
                    <div className="message-bubble">
                      <strong>
                        {message.sender.id === session?.user.id
                          ? 'You'
                          : message.sender.name || message.sender.email}
                      </strong>
                      <p>{message.text}</p>
                      <small>{stamp(message.created_at)}</small>
                    </div>
                  </div>
                ))}
                {pending.map((message) => (
                  <div className="message-row mine" key={message.client_message_id}>
                    <div className="message-bubble pending-message">
                      <strong>You</strong>
                      <p>{message.text}</p>
                      <small>{message.failed ? 'Not confirmed' : 'Sending…'}</small>
                      <button
                        className="text-btn"
                        onClick={() =>
                          sendMessage({
                            client_message_id: message.client_message_id,
                            text: message.text,
                          })
                        }
                      >
                        <RefreshCw size={12} /> Retry safely
                      </button>
                    </div>
                  </div>
                ))}
                <div ref={bottom} />
              </div>
              <form
                className="message-composer"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit();
                }}
              >
                <textarea
                  aria-label="Message"
                  placeholder="Write a message to your team..."
                  maxLength={4000}
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submit();
                    }
                  }}
                />
                <Button
                  disabled={!text.trim() || !selected || socket.status === 'Access unavailable'}
                  type="submit"
                  aria-label="Send message"
                >
                  <Send size={18} />
                </Button>
              </form>
              <div className="chat-note">
                Only added members of this project group can see this conversation.
              </div>
            </section>
          </div>
        ) : (
          <div className="card">
            <Empty
              title="Bring your team into the conversation"
              text={
                owner
                  ? 'Create a group and add accepted project members to start chatting.'
                  : 'Ask the project owner to add you to a chat group.'
              }
              action={
                owner ? (
                  <Button onClick={() => setModal('create')}>
                    <Plus size={16} /> Create group
                  </Button>
                ) : null
              }
            />
          </div>
        )}
      </QueryView>
      {modal === 'create' && (
        <GroupEditor
          projectId={project.id}
          members={rows(team.data?.members)}
          onClose={() => setModal(null)}
          onCreated={(group) => {
            client.setQueryData([`/api/v1/projects/${project.id}/chat/groups/`], (old: any) => [
              ...rows(old).filter((g) => g.id !== group.id),
              group,
            ]);
            setGroupId(group.id);
            setModal(null);
          }}
        />
      )}
      {modal === 'members' && selected && (
        <Modal title={`${selected.name} · members`} onClose={() => setModal(null)}>
          {rows(members.data).map((member) => (
            <div key={member.user.id} className="list-link">
              <div className="person">
                <Avatar name={member.user.name || member.user.email} />
                <div>
                  <strong>{member.user.name || member.user.email}</strong>
                  <small>{member.user.email}</small>
                </div>
              </div>
              {member.user.id === project.owner_id ? (
                <Badge>Owner</Badge>
              ) : (
                owner && (
                  <button
                    className="icon-btn danger"
                    aria-label={`Remove ${member.user.email} from group`}
                    onClick={() => {
                      if (confirm('Remove this member from the chat group?'))
                        remove.mutate(member.user.id);
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                )
              )}
            </div>
          ))}
          {owner && (
            <AddMembers
              projectId={project.id}
              groupId={selected.id}
              team={rows(team.data?.members)}
              existing={rows(members.data).map((m) => m.user.id)}
            />
          )}
        </Modal>
      )}
    </>
  );
}
function MemberChecks({
  members,
  selected,
  setSelected,
}: {
  members: Row[];
  selected: number[];
  setSelected: (ids: number[]) => void;
}) {
  return (
    <div className="member-checkbox-list">
      {members.map((member) => (
        <label key={member.user_id} className="check-row">
          <input
            type="checkbox"
            checked={selected.includes(member.user_id)}
            onChange={(e) =>
              setSelected(
                e.target.checked
                  ? [...selected, member.user_id]
                  : selected.filter((id) => id !== member.user_id),
              )
            }
          />
          <Avatar name={member.name || member.email} size="small" />
          <span>
            <strong>{member.name || member.email}</strong>
            <small>{member.email}</small>
          </span>
        </label>
      ))}
    </div>
  );
}
function GroupEditor({
  projectId,
  members,
  onClose,
  onCreated,
}: {
  projectId: number;
  members: Row[];
  onClose: () => void;
  onCreated: (g: Row) => void;
}) {
  const [v, setV] = useState<Row>({ name: '' });
  const [ids, setIds] = useState<number[]>([]);
  const save = useAction(
    () =>
      api(`/api/v1/projects/${projectId}/chat/groups/`, 'POST', {
        name: v.name,
        user_ids: ids,
      }),
    onCreated,
    'Project group created.',
  );
  return (
    <Modal title="Create a project group" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate(null);
        }}
      >
        <Fields
          fields={[{ key: 'name', label: 'Group name', required: true, wide: true }]}
          values={v}
          onChange={setV}
        />
        <h3>Add project members</h3>
        <p className="muted">
          You are included automatically. Only accepted project members are listed.
        </p>
        <MemberChecks members={members} selected={ids} setSelected={setIds} />
        {!members.length && (
          <p className="muted">You can add members after they accept a project invitation.</p>
        )}
        <div className="form-actions">
          <Button type="button" className="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" busy={save.isPending}>
            Create group
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function AddMembers({
  projectId,
  groupId,
  team,
  existing,
}: {
  projectId: number;
  groupId: number;
  team: Row[];
  existing: number[];
}) {
  const [ids, setIds] = useState<number[]>([]);
  const save = useAction(
    () =>
      api(`/api/v1/projects/${projectId}/chat/groups/${groupId}/members/`, 'POST', {
        user_ids: ids,
      }),
    () => setIds([]),
    'Members added.',
  );
  const available = team.filter((m) => !existing.includes(m.user_id));
  return (
    <>
      <h3>Add project members</h3>
      <MemberChecks members={available} selected={ids} setSelected={setIds} />
      {available.length ? (
        <Button disabled={!ids.length} busy={save.isPending} onClick={() => save.mutate(null)}>
          Add selected members
        </Button>
      ) : (
        <p className="muted">All accepted project members are already in this group.</p>
      )}
    </>
  );
}
