export function PermissionInfo() {
  return (
    <div className="mt-8 bg-tiffany-50 border border-tiffany-100 rounded-lg p-4">
      <h4 className="font-medium text-tiffany-900 mb-2">How permissions work</h4>
      <ul className="text-base text-tiffany-700 space-y-1">
        <li>
          <strong>Low risk</strong> actions (like adding context) can run without asking.
        </li>
        <li>
          <strong>Medium risk</strong> actions (like creating posts) will ask for confirmation.
        </li>
        <li>
          <strong>High risk</strong> actions (like sending Bitcoin) always require confirmation.
        </li>
        <li>
          You can revoke permissions at any time and My Cat will stop performing those actions.
        </li>
      </ul>
    </div>
  );
}
