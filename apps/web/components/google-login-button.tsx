'use client';

import { GoogleLogin } from '@react-oauth/google';

interface Props {
  onSuccess: (idToken: string) => Promise<void>;
  onError?: () => void;
}

export function GoogleLoginButton({ onSuccess, onError }: Props) {
  return (
    <GoogleLogin
      onSuccess={async (credentialResponse) => {
        if (credentialResponse.credential) {
          await onSuccess(credentialResponse.credential);
        }
      }}
      onError={onError}
      width="368"
      text="continue_with"
      shape="rectangular"
      logo_alignment="left"
    />
  );
}
