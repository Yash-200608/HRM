import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Package, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAssets,
  createAsset,
  checkoutAsset,
  returnAsset,
  getAssetHistory,
  getEmployees,
} from "@/services/Service";

const Assets: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [checkoutEmployeeId, setCheckoutEmployeeId] = useState("");
  const [checkoutDueAt, setCheckoutDueAt] = useState("");
  const [form, setForm] = useState({ name: "", category: "", serialNumber: "" });

  const companyId = user?.companyId?._id || user?.companyId;

  const load = async () => {
    setLoading(true);
    try {
      const response = await getAssets();
      setAssets(response?.data?.data ?? []);
      if (companyId) {
        const employeeData = await getEmployees(companyId);
        setEmployees(Array.isArray(employeeData) ? employeeData : employeeData?.employees || []);
      }
      if (selectedAssetId) {
        const historyRes = await getAssetHistory(selectedAssetId);
        setHistory(historyRes?.data?.data ?? []);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load assets",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedAssetId]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createAsset(form);
      toast({ title: "Asset created" });
      setForm({ name: "", category: "", serialNumber: "" });
      await load();
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleCheckout = async () => {
    if (!selectedAssetId || !checkoutEmployeeId) {
      toast({ title: "Select asset and employee", variant: "destructive" });
      return;
    }

    try {
      await checkoutAsset(selectedAssetId, {
        employeeId: checkoutEmployeeId,
        dueAt: checkoutDueAt || null,
      });
      toast({ title: "Asset checked out" });
      await load();
    } catch (error: any) {
      toast({
        title: "Checkout failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleReturn = async (assetId: string) => {
    try {
      await returnAsset(assetId, { conditionIn: "GOOD" });
      toast({ title: "Asset returned" });
      await load();
    } catch (error: any) {
      toast({
        title: "Return failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Assets | HRM</title>
      </Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Asset Management</h1>
            <p className="text-muted-foreground">Checkout, return, and audit asset assignment history.</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Register asset</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Serial number</Label>
                <Input
                  value={form.serialNumber}
                  onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                />
              </div>
              <div className="flex items-end">
                <Button type="submit">Add asset</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checkout workflow</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Asset</Label>
              <Select value={selectedAssetId} onValueChange={setSelectedAssetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select asset" />
                </SelectTrigger>
                <SelectContent>
                  {assets.map((asset) => (
                    <SelectItem key={asset._id} value={asset._id}>
                      {asset.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={checkoutEmployeeId} onValueChange={setCheckoutEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Assign to" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee._id} value={employee._id}>
                      {employee.fullName || employee.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Due date</Label>
              <Input type="date" value={checkoutDueAt} onChange={(e) => setCheckoutDueAt(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button onClick={handleCheckout}>Check out</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Assigned to</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset._id}>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{asset.assignedTo?.fullName || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{asset.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {asset.status === "ASSIGNED" && (
                        <Button size="sm" variant="outline" onClick={() => handleReturn(asset._id)}>
                          Return
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {selectedAssetId ? (
          <Card>
            <CardHeader>
              <CardTitle>Checkout history</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Checked out</TableHead>
                    <TableHead>Returned</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((entry) => (
                    <TableRow key={entry._id}>
                      <TableCell>{entry.employeeId?.fullName || "—"}</TableCell>
                      <TableCell>{new Date(entry.checkedOutAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {entry.returnedAt ? new Date(entry.returnedAt).toLocaleDateString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </>
  );
};

export default Assets;