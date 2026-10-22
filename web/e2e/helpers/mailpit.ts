import { MAILPIT_URL } from "./env";

type Message = { ID: string };

const query = (email: string) => encodeURIComponent(`to:${email}`);

export async function clearMailbox(email: string): Promise<void> {
  const res = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query(email)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`Mailpit DELETE failed: HTTP ${res.status}`);
}

/**
 * Polls Mailpit until a mail for `email` carries a link containing `pathPart`
 * (e.g. "/recover/reset") and returns the newest such link.
 */
export async function waitForLink(
  email: string,
  pathPart: string,
  timeoutMs = 15_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await fetch(`${MAILPIT_URL}/api/v1/search?query=${query(email)}`);
    if (list.ok) {
      const { messages } = (await list.json()) as { messages: Message[] };
      for (const { ID } of messages ?? []) {
        const msg = await fetch(`${MAILPIT_URL}/api/v1/message/${ID}`);
        const { Text = "" } = (await msg.json()) as { Text?: string };
        const link = Text.match(/https?:\/\/\S+/g)?.find((u) => u.includes(pathPart));
        if (link) return link.replace(/[).,]+$/, "");
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${email} with a link containing "${pathPart}" (Mailpit ${MAILPIT_URL})`);
}
