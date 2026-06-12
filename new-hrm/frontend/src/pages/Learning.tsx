import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { GraduationCap, Loader2, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  getLearningCourses,
  createLearningCourse,
  getLearningEnrollments,
  enrollLearningEmployee,
  upsertLearningQuiz,
  getLearningQuiz,
  submitLearningQuiz,
  getLearningCertificate,
  getEmployees,
} from "@/services/Service";
import { canAccessModule } from "@/lib/entitlements";
import { resolveCompanyIdFromUser } from "@/lib/tenant";
import { Link } from "react-router-dom";

type QuizQuestionDraft = {
  prompt: string;
  options: string[];
  correctIndex: number;
};

const emptyQuestion = (): QuizQuestionDraft => ({
  prompt: "",
  options: ["", ""],
  correctIndex: 0,
});

const Learning: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", description: "", durationMinutes: "" });

  const [quizCourseId, setQuizCourseId] = useState("");
  const [passPercent, setPassPercent] = useState("70");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([emptyQuestion()]);
  const [quizJsonMode, setQuizJsonMode] = useState(false);
  const [quizJson, setQuizJson] = useState("");

  const [enrollCourseId, setEnrollCourseId] = useState("");
  const [enrollEmployeeId, setEnrollEmployeeId] = useState("");

  const [activeEnrollmentId, setActiveEnrollmentId] = useState("");
  const [quizData, setQuizData] = useState<any | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [certificate, setCertificate] = useState<any | null>(null);

  const companyId = resolveCompanyIdFromUser(user);
  const learningEnabled = canAccessModule(user, "learning");

  const publishedCourses = useMemo(
    () => courses.filter((course) => course.status === "PUBLISHED"),
    [courses]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [courseRes, enrollmentRes] = await Promise.all([
        getLearningCourses(),
        getLearningEnrollments(),
      ]);
      setCourses(courseRes?.data?.data ?? []);
      setEnrollments(enrollmentRes?.data?.data ?? []);

      if (companyId) {
        const employeeData = await getEmployees(companyId);
        setEmployees(Array.isArray(employeeData) ? employeeData : employeeData?.employees || []);
      }
    } catch (error: any) {
      toast({
        title: "Failed to load learning data",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (learningEnabled) {
      load();
    } else {
      setLoading(false);
    }
  }, [learningEnabled]);

  useEffect(() => {
    if (!quizCourseId) return;

    getLearningQuiz(quizCourseId)
      .then((res) => {
        const data = res?.data?.data;
        if (data?.questions?.length) {
          setPassPercent(String(data.passPercent ?? 70));
          setQuizQuestions(
            data.questions.map((q: any) => ({
              prompt: q.prompt,
              options: q.options,
              correctIndex: 0,
            }))
          );
        }
      })
      .catch(() => {
        setQuizQuestions([emptyQuestion()]);
        setPassPercent("70");
      });
  }, [quizCourseId]);

  useEffect(() => {
    if (!activeEnrollmentId) {
      setQuizData(null);
      setQuizAnswers([]);
      setCertificate(null);
      return;
    }

    const enrollment = enrollments.find((e) => e._id === activeEnrollmentId);
    const courseId = enrollment?.courseId?._id || enrollment?.courseId;

    if (!courseId) return;

    getLearningQuiz(courseId)
      .then((res) => {
        const data = res?.data?.data;
        setQuizData(data);
        setQuizAnswers(Array(data?.questions?.length || 0).fill(0));
      })
      .catch((error: any) => {
        setQuizData(null);
        toast({
          title: "No quiz for this course",
          description: error?.response?.data?.message || error?.message,
          variant: "destructive",
        });
      });

    if (enrollment?.quizPassed || enrollment?.certificateId) {
      getLearningCertificate(activeEnrollmentId)
        .then((res) => setCertificate(res?.data?.data ?? null))
        .catch(() => setCertificate(null));
    } else {
      setCertificate(null);
    }
  }, [activeEnrollmentId, enrollments]);

  const handleCreateCourse = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await createLearningCourse({
        title: form.title,
        description: form.description,
        durationMinutes: Number(form.durationMinutes || 0),
        status: "PUBLISHED",
      });
      toast({ title: "Course published" });
      setForm({ title: "", description: "", durationMinutes: "" });
      await load();
    } catch (error: any) {
      toast({
        title: "Create failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleSaveQuiz = async () => {
    if (!quizCourseId) {
      toast({ title: "Select a course", variant: "destructive" });
      return;
    }

    try {
      let questions: QuizQuestionDraft[];

      if (quizJsonMode) {
        const parsed = JSON.parse(quizJson);
        questions = Array.isArray(parsed) ? parsed : parsed.questions;
        if (!Array.isArray(questions)) {
          throw new Error("JSON must be an array of questions or { questions: [...] }");
        }
      } else {
        questions = quizQuestions;
      }

      await upsertLearningQuiz(quizCourseId, {
        passPercent: Number(passPercent || 70),
        questions: questions.map((q) => ({
          prompt: q.prompt,
          options: q.options.filter(Boolean),
          correctIndex: q.correctIndex,
        })),
      });

      toast({ title: "Quiz saved" });
    } catch (error: any) {
      toast({
        title: "Quiz save failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleEnroll = async () => {
    if (!enrollCourseId || !enrollEmployeeId) {
      toast({ title: "Select course and employee", variant: "destructive" });
      return;
    }

    try {
      await enrollLearningEmployee({ courseId: enrollCourseId, employeeId: enrollEmployeeId });
      toast({ title: "Employee enrolled" });
      setEnrollCourseId("");
      setEnrollEmployeeId("");
      await load();
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmitQuiz = async () => {
    if (!activeEnrollmentId || !quizData?.questions?.length) return;

    setQuizSubmitting(true);
    try {
      const res = await submitLearningQuiz(activeEnrollmentId, quizAnswers);
      const result = res?.data?.data;
      toast({
        title: result?.quizResult?.passed ? "Quiz passed" : "Quiz submitted",
        description: `Score: ${result?.quizResult?.scorePercent ?? 0}%`,
      });
      await load();

      if (result?.quizResult?.passed || result?.certificateId) {
        const certRes = await getLearningCertificate(activeEnrollmentId);
        setCertificate(certRes?.data?.data ?? null);
      }
    } catch (error: any) {
      toast({
        title: "Quiz submit failed",
        description: error?.response?.data?.message || error?.message,
        variant: "destructive",
      });
    } finally {
      setQuizSubmitting(false);
    }
  };

  const updateQuestion = (index: number, patch: Partial<QuizQuestionDraft>) => {
    setQuizQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q))
    );
  };

  if (!learningEnabled) {
    return (
      <>
        <Helmet>
          <title>Learning | HRM</title>
        </Helmet>
        <div className="p-4 md:p-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Learning is not on your plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Course management, quizzes, and certificates require the Learning Management
                feature. Upgrade your subscription to unlock this module.
              </p>
              {user?.role === "admin" ? (
                <Button asChild>
                  <Link to="/billing">View plans</Link>
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

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
        <title>Learning | HRM</title>
      </Helmet>
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <GraduationCap className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Learning</h1>
            <p className="text-muted-foreground">
              Publish courses, configure quizzes, enroll employees, and issue certificates.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Create course</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateCourse} className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.durationMinutes}
                  onChange={(e) => setForm((f) => ({ ...f, durationMinutes: e.target.value }))}
                />
              </div>
              <div className="space-y-2 md:col-span-4">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div>
                <Button type="submit">Publish course</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Course quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={quizCourseId} onValueChange={setQuizCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishedCourses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pass percent</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={passPercent}
                  onChange={(e) => setPassPercent(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuizJsonMode((v) => !v)}
                >
                  {quizJsonMode ? "Form mode" : "JSON mode"}
                </Button>
                <Button type="button" onClick={handleSaveQuiz} disabled={!quizCourseId}>
                  Save quiz
                </Button>
              </div>
            </div>

            {quizJsonMode ? (
              <div className="space-y-2">
                <Label>Questions JSON</Label>
                <Textarea
                  rows={8}
                  placeholder={'[{"prompt":"...","options":["A","B"],"correctIndex":0}]'}
                  value={quizJson}
                  onChange={(e) => setQuizJson(e.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {quizQuestions.map((question, qIndex) => (
                  <div key={qIndex} className="rounded-lg border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Question {qIndex + 1}</Label>
                      {quizQuestions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setQuizQuestions((prev) => prev.filter((_, i) => i !== qIndex))
                          }
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Prompt"
                      value={question.prompt}
                      onChange={(e) => updateQuestion(qIndex, { prompt: e.target.value })}
                    />
                    {question.options.map((option, oIndex) => (
                      <div key={oIndex} className="flex gap-2 items-center">
                        <input
                          type="radio"
                          name={`correct-${qIndex}`}
                          checked={question.correctIndex === oIndex}
                          onChange={() => updateQuestion(qIndex, { correctIndex: oIndex })}
                        />
                        <Input
                          placeholder={`Option ${oIndex + 1}`}
                          value={option}
                          onChange={(e) => {
                            const options = [...question.options];
                            options[oIndex] = e.target.value;
                            updateQuestion(qIndex, { options });
                          }}
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        updateQuestion(qIndex, { options: [...question.options, ""] })
                      }
                    >
                      Add option
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setQuizQuestions((prev) => [...prev, emptyQuestion()])}
                >
                  Add question
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enroll employee</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 items-end">
              <div className="space-y-2">
                <Label>Course</Label>
                <Select value={enrollCourseId} onValueChange={setEnrollCourseId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishedCourses.map((course) => (
                      <SelectItem key={course._id} value={course._id}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={enrollEmployeeId} onValueChange={setEnrollEmployeeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
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
              <Button onClick={handleEnroll}>Enroll</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Take quiz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-w-md">
              <Label>Enrollment</Label>
              <Select value={activeEnrollmentId} onValueChange={setActiveEnrollmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select enrollment" />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((enrollment) => (
                    <SelectItem key={enrollment._id} value={enrollment._id}>
                      {enrollment.employeeId?.fullName || "Employee"} —{" "}
                      {enrollment.courseId?.title || "Course"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {quizData?.questions?.map((question: any, qIndex: number) => (
              <div key={qIndex} className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">
                  {qIndex + 1}. {question.prompt}
                </p>
                {question.options.map((option: string, oIndex: number) => (
                  <label key={oIndex} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`answer-${qIndex}`}
                      checked={quizAnswers[qIndex] === oIndex}
                      onChange={() =>
                        setQuizAnswers((prev) => {
                          const next = [...prev];
                          next[qIndex] = oIndex;
                          return next;
                        })
                      }
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            ))}

            {activeEnrollmentId && quizData?.questions?.length > 0 && (
              <Button onClick={handleSubmitQuiz} disabled={quizSubmitting}>
                {quizSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting…
                  </>
                ) : (
                  "Submit quiz"
                )}
              </Button>
            )}

            {certificate?.certificate && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 flex items-start gap-3">
                <Award className="h-6 w-6 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Certificate issued</p>
                  <p className="text-sm text-muted-foreground">
                    {certificate.courseTitle} — Score {certificate.certificate.scorePercent}%
                  </p>
                  <p className="text-sm font-mono mt-1">{certificate.certificate.certificateCode}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Courses</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.map((course) => (
                  <TableRow key={course._id}>
                    <TableCell>{course.title}</TableCell>
                    <TableCell>{course.durationMinutes} min</TableCell>
                    <TableCell>
                      <Badge variant="outline">{course.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Quiz</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment._id}>
                    <TableCell>{enrollment.employeeId?.fullName || "—"}</TableCell>
                    <TableCell>{enrollment.courseId?.title || "—"}</TableCell>
                    <TableCell>{enrollment.progressPercent}%</TableCell>
                    <TableCell>
                      {enrollment.quizScorePercent != null ? (
                        <Badge variant={enrollment.quizPassed ? "default" : "secondary"}>
                          {enrollment.quizScorePercent}%
                          {enrollment.quizPassed ? " pass" : " fail"}
                        </Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{enrollment.status}</Badge>
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

export default Learning;