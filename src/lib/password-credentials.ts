/**
 * Chromium 系の Password Credential API。
 * type="text" のパスワード欄でも、保存・自動入力を明示的に扱える。
 */

type PasswordCredData = {
  id: string;
  password: string;
  name?: string;
};

function getPasswordCredentialCtor():
  | (new (data: PasswordCredData) => Credential)
  | null {
  if (typeof window === "undefined") return null;
  if (!("PasswordCredential" in window)) return null;
  return (
    window as unknown as {
      PasswordCredential: new (data: PasswordCredData) => Credential;
    }
  ).PasswordCredential;
}

export async function storeLoginPassword(
  userId: string,
  password: string,
  displayName?: string,
): Promise<void> {
  try {
    const Ctor = getPasswordCredentialCtor();
    if (!Ctor || !navigator.credentials?.store) return;
    const cred = new Ctor({
      id: userId,
      password,
      name: displayName,
    });
    await navigator.credentials.store(cred);
  } catch {
    // 非対応・拒否は無視
  }
}

export async function loadSavedLoginPassword(): Promise<{
  userId: string;
  password: string;
} | null> {
  try {
    if (!navigator.credentials?.get) return null;
    const cred = await navigator.credentials.get({
      password: true,
      mediation: "optional",
    } as CredentialRequestOptions);
    if (!cred || cred.type !== "password") return null;
    const passwordCred = cred as Credential & {
      id: string;
      password?: string;
    };
    if (!passwordCred.password) return null;
    return { userId: passwordCred.id, password: passwordCred.password };
  } catch {
    return null;
  }
}
