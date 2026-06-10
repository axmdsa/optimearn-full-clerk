import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Shield, Unlock, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function FraudManagement() {
  const { data: flaggedUsers } = trpc.admin.fraud.getFlaggedUsers.useQuery();
  const { mutate: unflagUser } = trpc.admin.fraud.unflagUser.useMutation();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  const handleUnflag = (userId: number) => {
    unflagUser({ userId }, {
      onSuccess: () => {
        alert("User unflagged successfully");
        setSelectedUser(null);
      },
    });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold mb-2">Fraud Management</h1>
        <p className="text-muted-foreground">Monitor and manage flagged users with suspicious activity</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Flagged Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{flaggedUsers?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Users marked as suspicious</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked from Cashout</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{flaggedUsers?.length ?? 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Cannot redeem points</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locked Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">Pending verification</p>
          </CardContent>
        </Card>
      </div>

      {/* Flagged Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Flagged Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">User ID</th>
                  <th className="text-left py-3 px-4 font-semibold">Username</th>
                  <th className="text-left py-3 px-4 font-semibold">Reason</th>
                  <th className="text-left py-3 px-4 font-semibold">Flagged At</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {flaggedUsers && flaggedUsers.length > 0 ? (
                  flaggedUsers.map((user: any) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">{user.id}</td>
                      <td className="py-3 px-4 font-medium">{user.username}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500" />
                          <span className="text-xs">{user.suspiciousReason || "Suspicious activity"}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs text-muted-foreground">
                        {user.flaggedAt ? formatDistanceToNow(new Date(user.flaggedAt), { addSuffix: true }) : "—"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedDetail(user)}
                            className="gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUnflag(user.id)}
                            className="gap-1 text-green-600 hover:text-green-700"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Unflag
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      <div className="flex flex-col items-center gap-2">
                        <Shield className="w-8 h-8 text-green-500" />
                        <p>No flagged users - all systems clear!</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* User Detail Modal */}
      {selectedDetail && (
        <Dialog open={!!selectedDetail} onOpenChange={(open) => !open && setSelectedDetail(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>User Details: {selectedDetail.username}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-3">Account Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">User ID</p>
                    <p className="font-medium">{selectedDetail.id}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Email</p>
                    <p className="font-medium">{selectedDetail.email}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <Badge variant="destructive">Flagged</Badge>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Flagged At</p>
                    <p className="font-medium">
                      {selectedDetail.flaggedAt
                        ? formatDistanceToNow(new Date(selectedDetail.flaggedAt), { addSuffix: true })
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Reason for Flagging</h3>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-sm text-red-800">{selectedDetail.suspiciousReason || "Suspicious activity detected"}</p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Account Status</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Can Cashout</span>
                    <Badge variant="secondary">Blocked</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Can Earn Points</span>
                    <Badge variant="outline">Allowed</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">All New Earnings</span>
                    <Badge variant="secondary">Locked</Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleUnflag(selectedDetail.id)}
                  className="flex-1 gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Unflag User
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectedDetail(null)}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
