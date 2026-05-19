export function PermissionInfo() {
  return (
    <div className="mt-8 rounded-md border border-border-subtle bg-muted/30 p-4">
      <h4 className="mb-2 font-medium text-foreground">How permissions work</h4>
      <ul className="space-y-1 text-base text-muted-foreground">
        <li>
          <strong>Low risk</strong> actions (like adding context) can run without asking.
        </li>
        <li>
          <strong>Medium risk</strong> actions (like creating posts) will ask for confirmation.
        </li>
        <li>
          <strong>High risk</strong> actions (like sending Bitcoin) always require confirmation.
        </li>
        <li>You can revoke permissions at any time and Cat will stop performing those actions.</li>
      </ul>
    </div>
  );
}
