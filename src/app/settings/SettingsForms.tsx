"use client";

import { useRef, useState, useTransition } from "react";
import { KeyRound, Save, User } from "lucide-react";
import { useUI } from "@/components/UIProvider";
import Avatar from "@/components/Avatar";
import { Alert, Button, Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import type { ActionResult } from "@/lib/utils";
import { updateBio, updatePassword } from "./actions";

function useActionForm(action: (fd: FormData) => Promise<ActionResult>, onSuccess?: () => void) {
  const { toast } = useUI();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await action(fd);
      if (!res.ok) return setError(res.error);
      setError(null);
      toast(res.message ?? "Enregistré");
      onSuccess?.();
    });
  };
  return { pending, error, submit };
}

export default function SettingsForms({ username, email, bio }: { username: string; email: string; bio: string }) {
  const [bioText, setBioText] = useState(bio);
  const pwdForm = useRef<HTMLFormElement>(null);
  const profile = useActionForm(updateBio);
  const password = useActionForm(updatePassword, () => pwdForm.current?.reset());

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader icon={<User className="size-[18px]" />} title="Profil public" />
        <form onSubmit={profile.submit} className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <Avatar name={username} size="lg" />
            <div className="min-w-0">
              <div className="text-lg font-bold">{username}</div>
              <div className="truncate text-sm text-ink-dim">{email}</div>
            </div>
          </div>
          <Field label="Bio" htmlFor="bio" hint={`${bioText.length}/300 — visible sur ton profil public.`}>
            <Textarea
              id="bio"
              name="bio"
              maxLength={300}
              value={bioText}
              onChange={(e) => setBioText(e.target.value)}
              placeholder="Ce que tu filmes, où, quand…"
            />
          </Field>
          {profile.error && <Alert tone="error">{profile.error}</Alert>}
          <Button type="submit" variant="primary" className="self-start" loading={profile.pending}>
            {!profile.pending && <Save className="size-4" />} Enregistrer
          </Button>
        </form>
      </Card>

      <Card>
        <CardHeader icon={<KeyRound className="size-[18px]" />} title="Mot de passe" />
        <form ref={pwdForm} onSubmit={password.submit} className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nouveau mot de passe" htmlFor="password" hint="8 caractères minimum.">
              <Input id="password" name="password" type="password" minLength={8} maxLength={128} required autoComplete="new-password" />
            </Field>
            <Field label="Confirmation" htmlFor="confirm">
              <Input id="confirm" name="confirm" type="password" minLength={8} maxLength={128} required autoComplete="new-password" />
            </Field>
          </div>
          {password.error && <Alert tone="error">{password.error}</Alert>}
          <Button type="submit" className="self-start" loading={password.pending}>
            Changer le mot de passe
          </Button>
        </form>
      </Card>
    </div>
  );
}
