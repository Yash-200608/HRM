import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  getMyPerformanceReviews,
  acknowledgePerformanceReview,
} from "@/services/Service";

const MyPerformance: React.FC = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<any[]>([]);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getMyPerformanceReviews();
      setReviews(response?.data?.data ?? []);
    } catch (error: any) {
      toast({
        title: "Failed to load your reviews",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAcknowledge = async (reviewId: string) => {
    setAcknowledgingId(reviewId);
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
    } finally {
      setAcknowledgingId(null);
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
        <title>My Performance | HRM</title>
      </Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Target className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My Performance</h1>
            <p className="text-muted-foreground">
              View performance reviews assigned to you and acknowledge completed feedback.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your reviews</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length === 0 ? (
              <p className="text-sm text-muted-foreground">No performance reviews assigned yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review._id}>
                      <TableCell>{review.cycleId?.name || "—"}</TableCell>
                      <TableCell>
                        {review.reviewerId?.username || review.reviewerId?.email || "—"}
                      </TableCell>
                      <TableCell>{review.rating ?? "—"}</TableCell>
                      <TableCell className="max-w-xs truncate">{review.summary || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{review.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {review.status === "SUBMITTED" ? (
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(review._id)}
                            disabled={acknowledgingId === review._id}
                          >
                            {acknowledgingId === review._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Acknowledge"
                            )}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default MyPerformance;