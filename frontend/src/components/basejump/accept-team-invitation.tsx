import { acceptInvitation } from '@/lib/actions/invitations';
import { createClient } from '@/lib/supabase/server';
import { Alert } from '../ui/alert';
import { Card, CardContent } from '../ui/card';
import { SubmitButton } from '../ui/submit-button';

type Props = {
  token: string;
};

export default async function AcceptTeamInvitation({ token }: Props) {
  // Check if essential Supabase environment variables are present
  // If not (e.g., during build without runtime env vars), render a fallback or nothing.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p>Loading invitation...</p>
        </CardContent>
      </Card>
    );
  }

  const supabaseClient = await createClient();
  const { data: invitation, error } = await supabaseClient.rpc('lookup_invitation', {
    lookup_invitation_token: token,
  });

  if (error) {
    console.error('Error looking up invitation:', error);
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Alert variant="destructive">
            Could not load invitation details. Please try again later.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!invitation) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Alert variant="destructive">
            Invalid or expired invitation token.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-8 text-center flex flex-col gap-y-8">
        <div>
          <p>You've been invited to join</p>
          <h1 className="text-xl font-bold">{invitation.account_name || 'a team'}</h1>
        </div>
        {invitation.active ? (
          <form>
            <input type="hidden" name="token" value={token} />
            <SubmitButton
              formAction={acceptInvitation}
              pendingText="Accepting invitation..."
            >
              Accept invitation
            </SubmitButton>
          </form>
        ) : (
          <Alert variant="destructive">
            This invitation has been deactivated. Please contact the account
            owner for a new invitation.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
