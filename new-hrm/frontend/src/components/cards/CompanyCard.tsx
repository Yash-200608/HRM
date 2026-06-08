// import React, { useEffect, useState } from 'react';
// import { Users, Building, MapPin,FileText, Folder } from 'lucide-react';
// import { cn } from '@/lib/utils';
// import {getCompanys} from "@/services/Service";
// import { useAuth } from '@/contexts/AuthContext';
// import { useToast } from '@/hooks/use-toast';

// interface Company {
//   name: string;
//   logoUrl?: string;
//   adminName: string;
//   employeesCount: number;
//   location?: string;
//   industry?: string;
// }

// const CompanyCard: React.FC<{ company: Company }> = ({ company }) => {
//   const { name, logoUrl, adminName, employeesCount, location = 'Unknown', industry = 'General' } = company;

//   return (
//     <div className="max-w-sm w-full bg-white dark:bg-gray-800 shadow-md rounded-xl p-6 animate-fade-in hover:shadow-xl transition-shadow">
//       <div className="flex items-center mb-4">
//         {logoUrl ? (
//           <img
//             src={logoUrl}
//             alt={`${name} logo`}
//             className="w-14 h-14 rounded-full object-cover border border-gray-200"
//           />
//         ) : (
//           <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
//             {name.charAt(0)}
//           </div>
//         )}
//         <div className="ml-4">
//           <h2 className="text-xl font-bold">{name}</h2>
//           <p className="text-sm text-muted-foreground">Admin: {adminName}</p>
//         </div>
//       </div>

//       <div className="flex flex-col gap-3">
//         <div className="flex items-center text-sm text-muted-foreground">
//           <Users className="w-5 h-5 mr-2 text-primary" />
//           Employees: {employeesCount}
//         </div>
//          <div className="flex items-center text-sm text-muted-foreground">
//           <Folder className="w-5 h-5 mr-2 text-primary" />
//           Project: {employeesCount}
//         </div>
//         <div className="flex items-center text-sm text-muted-foreground">
//           <MapPin className="w-5 h-5 mr-2 text-primary" />
//           Location: {location}
//         </div>
//         <div className="flex items-center text-sm text-muted-foreground">
//           <Building className="w-5 h-5 mr-2 text-primary" />
//           Industry: {industry}
//         </div>
//       </div>
//     </div>
//   );
// };

// const CompanyList: React.FC = () => {

//    const {user} = useAuth();
//    const {toast} = useToast();
//    const [companyList, setCompanyList] = useState([]);

//     const handleGetCompany = async () => {
//       try {
//         const res = await getCompanys(user?._id);
//         console.log(res)
//         if (res.status === 200) {
//           setCompanyList(Array.isArray(res.data) ? res.data : []);
//         }
//       }
//       catch (err) {
//         console.log(err);
//         toast({title:"Error", description:err?.message || err?.response?.data?.message, variant:"destructive"})
//       }
//     }

//     useEffect(() => {
//       handleGetCompany()
//     }, [])

//   return (
//     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//       {companyList?.map((company, idx) => (
//         <CompanyCard key={company?._id} company={company} />
//       ))}
//     </div>
//   );
// };

// export default CompanyList;




















import React, { useEffect, useState } from 'react';
import { Users, Building, MapPin, Folder, History, Phone, Calendar, Globe } from 'lucide-react';
import { getCompanysByDashboard } from "@/services/Service";
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from "@/services/allFunctions";
import { Company } from '@/types';
import { useAppDispatch, useAppSelector } from '@/redux-toolkit/hooks/hook';
import { getCompany, getRecentActivities } from '@/redux-toolkit/slice/allPage/companySlice';

// interface Company {
//   _id: string;
//   name: string;
//   logo?: string;
//   totalEmployees: number;
//   location?: string;
//   industry?: string;
//   totalProjects?: string;
//   createdAt?: string;
//   contactNumber?: string;
//   address?: string;
//   adminNames?: string;
//   isActive?: boolean;
//   website?: string;
// }

const CompanyCard: React.FC<{ company: Company }> = ({ company }) => {
  const { name, logo, isActive, createdAt, totalEmployees, website, totalProjects, address, adminNames, industry, contactNumber } = company;

  return (
    <div className="relative w-full bg-white dark:bg-gray-800 shadow-md rounded-xl p-4 hover:shadow-xl transition-shadow max-h-[350px] overflow-y-auto">

      {/* 🔹 Status Badge (Top Right) */}
      <div className="absolute top-4 right-4">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full 
        ${isActive
              ? "bg-green-100 text-green-600"
              : "bg-red-100 text-red-600"}`}
        >
          {isActive ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="flex items-center mb-4">
        {logo ? (
          <img
            src={logo}
            alt={`${name} logo`}
            className="w-14 h-14 rounded-full object-cover border border-gray-200"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
            {name.charAt(0)}
          </div>
        )}
        <div className="ml-4">
          <h2 className="text-xl font-bold">{name}</h2>
          <p className="text-sm text-muted-foreground">
            Admin: {adminNames?.[0] || "No Admin"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 text-sm text-muted-foreground">
        <div className="flex items-center">
          <Users className="w-5 h-5 mr-2 text-primary" />
          Employees: {totalEmployees}
        </div>

        <div className="flex items-center">
          <Folder className="w-5 h-5 mr-2 text-primary" />
          Projects: {totalProjects}
        </div>

        <div className="flex items-center">
          <MapPin className="w-5 h-5 mr-2 text-primary" />
          Location: {address}
        </div>

        <div className="flex items-center">
          <Phone className="w-5 h-5 mr-2 text-primary" />
          Contact: {contactNumber}
        </div>

        <div className="flex items-center">
          <Building className="w-5 h-5 mr-2 text-primary" />
          Industry: {industry || "IT"}
        </div>

        {/* 🔹 Created Date */}
        <div className="flex items-center">
          <Calendar className="w-5 h-5 mr-2 text-primary" />
          Created: {new Date(createdAt).toLocaleDateString()}
        </div>
        <div className="flex items-center">
          <Globe className="w-5 h-5 mr-2 text-primary" />
          Website: {website}
        </div>
      </div>
    </div>
  );

};


const CompanyList: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  // const [companyList, setCompanyList] = useState<Company[]>([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const dispatch = useAppDispatch();
  const companyList = useAppSelector((state) => state.company.company);
  const recentActivities = useAppSelector((state) => state.company.recentActivities);



  const handleGetCompany = async () => {
    if(!user && user?.role !== "super_admin") return;
    try {
      const res = await getCompanysByDashboard(user?._id);
      if (res.status === 200) {
        dispatch(getCompany(res.data?.companies || []));
        dispatch(getRecentActivities(res.data?.recentActivities || []));
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || err?.response?.data?.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if(user && user?.role === "super_admin" && (companyList.length === 0 || recentActivities.length === 0)){
      handleGetCompany();
    }
  }, [companyList.length, recentActivities.length, user]);

  return (
  <div className="space-y-8">
    {/* Company Cards */}
    <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[800px] overflow-y-auto">
      {companyList && companyList.length > 0 ? (
        companyList.map((company) => (
          <CompanyCard key={company._id} company={company} />
        ))
      ) : (
        <div className="col-span-full text-center text-muted-foreground py-6">
          No Companies Found.
        </div>
      )}
    </div>

    {/* Full Width Recent History */}
    <div className="w-full bg-white dark:bg-gray-800 shadow-md rounded-xl p-6">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <History className="w-5 h-5" />
        Recent History
      </h2>

      <div className="space-y-3 max-h-[400px] overflow-y-auto">
        {recentActivities && recentActivities.length > 0 ? (
          recentActivities.map((item) => (
            <div
              key={item._id}
              className="w-full bg-muted/40 rounded-lg p-4 text-sm flex items-start justify-between"
            >
              <div>
                <div className="font-medium">
                  Company :- {item?.companyId?.name}
                </div>
                <div className="text-muted-foreground">
                  Admin:- {item?.createdBy?.username}
                </div>
                <div className="mt-1">Title :- {item.title}</div>
              </div>

              <div className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                {formatDate(item.date)}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-muted-foreground py-6">
            No Recent History Found.
          </div>
        )}
      </div>
    </div>
  </div>
);
};

export default CompanyList;