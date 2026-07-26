"use client";

import { useState } from "react";

import { formatIsoInstant } from "@/components/home/research-and-development/sections/compensation-format";
import { INTEGRATION_PROVIDER_LABELS } from "@/mocks/research-and-development-oversight-mocks";
import type {
  IntegrationConnection,
  IntegrationConnectionStatus,
  TeamMember,
} from "@/types/research-and-development";

const CONNECTION_STATUS_BADGES: Record<
  IntegrationConnectionStatus,
  { label: string; className: string }
> = {
  connected: { label: "Connected", className: "bg-[#00696E]/10 text-[#00696E]" },
  not_connected: { label: "Not connected", className: "bg-muted text-muted-foreground" },
  revoked: { label: "Revoked", className: "bg-red-100 text-red-800" },
  expired: { label: "Expired", className: "bg-amber-100 text-amber-800" },
};

type LocalConnectionState = {
  providerKey: string;
  status: IntegrationConnectionStatus;
  grantedScopeKeys: string[];
};

// Integration consent (§14.2): connect, scope, revoke. This is the surface that
// makes Proof of Effort lawful rather than merely functional — reading a
// member's commits, tickets and file revisions is monitoring their work, and it
// needs a screen where they can see exactly what is read, why, for how long, and
// switch it off. Every action here is local state only this phase.
export default function IntegrationConsentTab({
  connections,
  teamMembers,
}: {
  connections: IntegrationConnection[];
  teamMembers: TeamMember[];
}) {
  const [localStates, setLocalStates] = useState<LocalConnectionState[]>([]);
  const [draftScopeKeysByProvider, setDraftScopeKeysByProvider] = useState<
    Record<string, string[]>
  >({});

  const resolveConnection = (connection: IntegrationConnection) => {
    const localState = localStates.find(
      (candidateState) => candidateState.providerKey === connection.providerKey,
    );
    return localState
      ? {
          ...connection,
          status: localState.status,
          grantedScopeKeys: localState.grantedScopeKeys,
        }
      : connection;
  };

  const resolveDraftScopeKeys = (connection: IntegrationConnection) =>
    draftScopeKeysByProvider[connection.providerKey] ??
    connection.scopes.filter((scope) => scope.isRequired).map((scope) => scope.key);

  const handleScopeToggle = (connection: IntegrationConnection, scopeKey: string) => {
    const currentKeys = resolveDraftScopeKeys(connection);
    setDraftScopeKeysByProvider((currentDrafts) => ({
      ...currentDrafts,
      [connection.providerKey]: currentKeys.includes(scopeKey)
        ? currentKeys.filter((candidateKey) => candidateKey !== scopeKey)
        : [...currentKeys, scopeKey],
    }));
  };

  const handleConnectClick = (connection: IntegrationConnection) =>
    setLocalStates((currentStates) => [
      ...currentStates.filter(
        (candidateState) => candidateState.providerKey !== connection.providerKey,
      ),
      {
        providerKey: connection.providerKey,
        status: "connected",
        grantedScopeKeys: resolveDraftScopeKeys(connection),
      },
    ]);

  const handleRevokeClick = (connection: IntegrationConnection) =>
    setLocalStates((currentStates) => [
      ...currentStates.filter(
        (candidateState) => candidateState.providerKey !== connection.providerKey,
      ),
      { providerKey: connection.providerKey, status: "revoked", grantedScopeKeys: [] },
    ]);

  return (
    <div className="space-y-6 px-4 lg:px-6">
      <div className="space-y-2 rounded-2xl bg-[#00696E]/5 p-4">
        <p className="text-sm">
          Proof of Effort works by cross-referencing your claims against receipts these tools
          already produce. It reads <span className="font-medium">metadata only</span> — timestamps,
          authorship, state changes. It never reads your source code, your documents, or the
          contents of a design file.
        </p>
        <p className="text-xs text-muted-foreground">
          You can revoke any connection at any time. Claims made after a revocation simply verify
          with fewer receipts — nothing is retroactively invalidated, and no cash is ever affected.
        </p>
      </div>

      <div className="max-w-2xl space-y-3">
        {connections.map((connection) => {
          const resolvedConnection = resolveConnection(connection);
          const statusBadge = CONNECTION_STATUS_BADGES[resolvedConnection.status];
          const connector = resolvedConnection.connectedByMemberId
            ? teamMembers.find(
                (teamMember) => teamMember.id === resolvedConnection.connectedByMemberId,
              )
            : undefined;
          const isConnected = resolvedConnection.status === "connected";
          const draftScopeKeys = resolveDraftScopeKeys(connection);

          return (
            <div
              key={connection.providerKey}
              className="space-y-3 rounded-2xl border border-[#CAC4D0]/60 p-4"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">
                  {INTEGRATION_PROVIDER_LABELS[connection.providerKey]}
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge.className}`}
                >
                  {statusBadge.label}
                </span>
                <span className="ml-auto text-xs text-muted-foreground">
                  Receipts kept {resolvedConnection.dataRetentionDays} days
                </span>
              </div>

              <p className="text-xs text-muted-foreground">
                {resolvedConnection.evidenceContributionNote}
              </p>

              <ul className="space-y-2">
                {connection.scopes.map((scope) => {
                  const isGranted = isConnected
                    ? resolvedConnection.grantedScopeKeys.includes(scope.key)
                    : draftScopeKeys.includes(scope.key);
                  return (
                    <li key={scope.key} className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isGranted}
                        disabled={isConnected || scope.isRequired}
                        onChange={() => handleScopeToggle(connection, scope.key)}
                        aria-label={scope.displayLabel}
                        className="mt-0.5 size-4 shrink-0 accent-[#00696E]"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm">
                          {scope.displayLabel}
                          {scope.isRequired && (
                            <span className="ml-1.5 text-xs text-muted-foreground">(required)</span>
                          )}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {scope.purposeNote}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-center gap-3">
                {isConnected ? (
                  <button
                    type="button"
                    onClick={() => handleRevokeClick(connection)}
                    className="cursor-pointer rounded-full border border-[#6F7979] px-4 py-2 text-sm font-medium text-[#BA1A1A]"
                  >
                    Revoke access
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleConnectClick(connection)}
                    className="cursor-pointer rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                  >
                    Connect {INTEGRATION_PROVIDER_LABELS[connection.providerKey]}
                  </button>
                )}
                <span className="text-xs text-muted-foreground">
                  {isConnected && connector ? `Connected by ${connector.name}` : ""}
                  {isConnected && resolvedConnection.lastSyncedAt
                    ? ` · last read ${formatIsoInstant(resolvedConnection.lastSyncedAt)}`
                    : ""}
                  {resolvedConnection.status === "revoked" && resolvedConnection.revokedAt
                    ? `Revoked ${formatIsoInstant(resolvedConnection.revokedAt)}`
                    : ""}
                  {resolvedConnection.status === "expired"
                    ? "Token expired — reconnect to restore receipts"
                    : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Consent, scopes and revocation are display-only mocks — the OAuth grant, the token store and
        the retention job are backend-owned later.
      </p>
    </div>
  );
}
