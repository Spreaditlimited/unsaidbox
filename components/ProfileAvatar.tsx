"use client";
import { useState } from "react";

export function ProfileAvatar({
  name,
  version,
  large = false,
}: {
  name: string;
  version: string | null;
  large?: boolean;
}) {
  const [failedVersion, setFailedVersion] = useState<string | null>(null);
  return (
    <span className={`account-avatar${large ? " profile-avatar-large" : ""}`}>
      {version && failedVersion !== version ? (
        // The authenticated endpoint must receive the viewer's cookie; don't proxy through the image optimizer.
        <img
          src={`/api/account/avatar?v=${version}`}
          alt=""
          width={large ? 88 : 34}
          height={large ? 88 : 34}
          onError={() => setFailedVersion(version)}
        />
      ) : (
        <span aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
}
