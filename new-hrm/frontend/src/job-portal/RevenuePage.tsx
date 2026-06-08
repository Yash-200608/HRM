import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Helmet } from "react-helmet-async";

// Mock Data
const revenueData = [
  { name: "Jan", revenue: 4000, subscriptions: 240 },
  { name: "Feb", revenue: 3000, subscriptions: 139 },
  { name: "Mar", revenue: 2000, subscriptions: 980 },
  { name: "Apr", revenue: 2780, subscriptions: 390 },
  { name: "May", revenue: 1890, subscriptions: 480 },
  { name: "Jun", revenue: 2390, subscriptions: 380 },
  { name: "Jul", revenue: 3490, subscriptions: 430 },
];

const transactionsData = [
  {
    id: "INV-001",
    company: "TechNova",
    amount: "$299.00",
    date: "2024-03-15",
    status: "Paid",
    plan: "Pro Plan",
    avatar: "https://github.com/shadcn.png",
  },
  {
    id: "INV-002",
    company: "GreenFields",
    amount: "$599.00",
    date: "2024-03-14",
    status: "Pending",
    plan: "Enterprise",
    avatar: "https://github.com/shadcn.png",
  },
  {
    id: "INV-003",
    company: "MediCare Plus",
    amount: "$299.00",
    date: "2024-03-12",
    status: "Paid",
    plan: "Pro Plan",
    avatar: "https://github.com/shadcn.png",
  },
  {
    id: "INV-004",
    company: "FinServe",
    amount: "$99.00",
    date: "2024-03-10",
    status: "Failed",
    plan: "Basic Plan",
    avatar: "https://github.com/shadcn.png",
  },
  {
    id: "INV-005",
    company: "EduLearn",
    amount: "$599.00",
    date: "2024-03-08",
    status: "Paid",
    plan: "Enterprise",
    avatar: "https://github.com/shadcn.png",
  },
];

const RevenuePage: React.FC = () => {
  const [timeRange, setTimeRange] = useState("Last 7 Days");

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Paid":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none gap-1">
            <CheckCircle2 className="h-3 w-3" /> Paid
          </Badge>
        );
      case "Pending":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-none gap-1">
            <Clock className="h-3 w-3" /> Pending
          </Badge>
        );
      case "Failed":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none gap-1">
            <XCircle className="h-3 w-3" /> Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <>
      <Helmet>
        <title>Revenue | Job Portal</title>
      </Helmet>

      <div className="flex flex-col min-h-screen bg-gray-50/40 p-6 space-y-6">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Revenue & Billing</h1>
            <p className="text-muted-foreground mt-1">
              Monitor your financial performance, subscriptions, and transaction history.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[160px] bg-white">
                <SelectValue placeholder="Select Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Last 7 Days">Last 7 Days</SelectItem>
                <SelectItem value="Last 30 Days">Last 30 Days</SelectItem>
                <SelectItem value="This Year">This Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2 bg-white">
              <Download className="h-4 w-4" /> Export Report
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$45,231.89</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +20.1% from last month
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+2350</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                +180 new this month
              </p>
            </CardContent>
          </Card>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Churn Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2.4%</div>
              <p className="text-xs text-muted-foreground mt-1 flex items-center text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                +0.4% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 md:grid-cols-7">
          <Card className="md:col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Monthly revenue breakdown for the current year.</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value}`} />
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <Tooltip />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 shadow-sm">
            <CardHeader>
              <CardTitle>Subscription Growth</CardTitle>
              <CardDescription>New subscriptions vs Cancellations.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Legend />
                    <Bar dataKey="subscriptions" name="New Subs" fill="#16a34a" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions Table */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Latest billing activity and invoices.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="gap-1 text-blue-600">
              View All <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Invoice</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsData.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.id}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={tx.avatar} />
                          <AvatarFallback>{tx.company.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <span>{tx.company}</span>
                      </div>
                    </TableCell>
                    <TableCell>{tx.plan}</TableCell>
                    <TableCell>{tx.date}</TableCell>
                    <TableCell>{tx.amount}</TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
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

export default RevenuePage;
