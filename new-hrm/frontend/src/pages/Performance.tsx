import React, { useEffect, useMemo, useState } from "react";
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
import { Target, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getPerformanceCycles,
  createPerformanceCycle,
  getPerformanceReviews,
  bulkAssignPerformanceReviews,
  submitPerformanceReview,
  acknowledgePerformanceReview,
  getEmployees,
} from "@/services/Service";

const Performance: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [cycles, setCycles] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "" });
  const [submitDraft, setSubmitDraft] = useState<Record<string, { rating: string; summary: string }>>({});

  const companyId = user?.companyId?._id || user?.companyId;

  const load = async () => {
    setLoading(true);
    try {
      const [cycleRes, reviewRes] = await Promise.all([
        getPerformanceCycles(),
        getPerformanceReviews(selectedCycleId || undefined),
      ]);
      setCycles(cycleRes?.data?.data ?? []);
      setReviews(reviewRes?.data?.data ?? []);

      if (companyId) {
        const employeeData = await getEmployees(companyId);
        setEmployees(Array.isArray(employeeData) ? employeeData : employeeData?.employees || []);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load performance data",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [selectedCycleId]);

  const activeCycles = useMemo(
    () => cycles.filter((cycle) => cycle.status === "ACTIVE" || cycle.status === "DRAFT"),
    [cycles]
  );

  const toggleEmployee = (employeeId: string) => {
    setSelectedEmployeeIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  };

  const handleCreateCycle = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createPerformanceCycle({ ...form, status: "ACTIVE" });
      toast({ title: "Review cycle created" });
      setForm({ name: "", startDate: "", endDate: "" });
      await load();
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedCycleId || selectedEmployeeIds.length === 0) {
      toast({ title: "Select a cycle and at least one employee", variant: "destructive" });
      return;
    }

    try {
      const response = await bulkAssignPerformanceReviews({
        cycleId: selectedCycleId,
        employeeIds: selectedEmployeeIds,
      });
      toast({
        title: "Reviews assigned",
        description: `${response?.data?.data?.createdCount ?? 0} review(s) created`,
      });
      setSelectedEmployeeIds([]);
      await load();
    } catch (error: any) {
      toast({
        title: "Assignment failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitReview = async (reviewId: string) => {
    const draft = submitDraft[reviewId];
    if (!draft?.rating) {
      toast({ title: "Rating is required", variant: "destructive" });
      return;
    }

    try {
      await submitPerformanceReview(reviewId, {
        rating: Number(draft.rating),
        summary: draft.summary,
        status: "SUBMITTED",
      });
      toast({ title: "Review submitted" });
      await load();
    } catch (error: any) {
      toast({
        title: "Submit failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleAcknowledge = async (reviewId: string) => {
    try {
      await acknowledgePerformanceReview(reviewId);
      toast({ title: "Review acknowledged" });
      await load();
    } catch (error: any) {
      toast({
        title: "Acknowledge failed",
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
        <title>Performance | HRM</title>
      </Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Performance Reviews</h1>
            <p className="text-muted-foreground">
              Assign cycles, submit manager reviews, and close the loop with acknowledgements.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create review cycle</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCycle} className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Start date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>End date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit">Create cycle</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bulk assign employees</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Cycle</Label>
                <Select value={selectedCycleId} onValueChange={setSelectedCycleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeCycles.map((cycle) => (
                      <SelectItem key={cycle._id} value={cycle._id}>
                        {cycle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 flex items-end">
                <Button onClick={handleBulkAssign}>Assign selected employees</Button>
              </div>
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              {employees.map((employee) => (
                <label key={employee._id} className="flex items-center gap-2 text-sm border rounded-md p-2">
                  <input
                    type="checkbox"
                    checked={selectedEmployeeIds.includes(employee._id)}
                    onChange={() => toggleEmployee(employee._id)}
                  />
                  {employee.fullName || employee.email}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Review workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reviews.map((review) => (
                  <TableRow key={review._id}>
                    <TableCell>{review.employeeId?.fullName || review.employeeId}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{review.status}</Badge>
                    </TableCell>
                    <TableCell>
                      {review.status === "PENDING" ? (
                        <Input
                          type="number"
                          min={1}
                          max={5}
                          className="w-20"
                          value={submitDraft[review._id]?.rating || ""}
                          onChange={(e) =>
                            setSubmitDraft((draft) => ({
                              ...draft,
                              [review._id]: {
                                rating: e.target.value,
                                summary: draft[review._id]?.summary || "",
                              },
                            }))
                          }
                        />
                      ) : (
                        review.rating ?? "—"
                      )}
                    </TableCell>
                    <TableCell className="space-x-2">
                      {review.status === "PENDING" && (
                        <Button size="sm" onClick={() => handleSubmitReview(review._id)}>
                          Submit
                        </Button>
                      )}
                      {review.status === "SUBMITTED" && (
                        <Button size="sm" variant="outline" onClick={() => handleAcknowledge(review._id)}>
                          Acknowledge
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default Performance;