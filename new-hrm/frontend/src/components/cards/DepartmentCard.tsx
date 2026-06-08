

// import React, { useEffect, useState } from "react";
// import { Briefcase, Loader2, User } from "lucide-react";
// import { Button } from "@/components/ui/button";
// import {updateEmployeeByDepartment} from "@/services/Service";
// import { useAuth } from "@/contexts/AuthContext";
// import { useToast } from "@/hooks/use-toast";
// import { socket } from "@/socket/socket";

// const DepartmentCard = ({refreshList,departmentData,setSelectedDepartmentEmployees, employees, onClose, departmentList }) => {
//   const {user} = useAuth();
//   const {toast} = useToast();
//   const [showActionCard, setShowActionCard] = useState(false);
//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [selectedDepartments, setSelectedDepartments] = useState([]);
//   const [isLoading, setIsLoading] = useState(false);

//   useEffect(() => {
//   if (selectedEmployee) {
//     setSelectedDepartments([selectedEmployee.department?._id]); 
//   }
// }, [selectedEmployee]);

// useEffect(() => {
//   if (selectedEmployee && employees?.length > 0) {
//     const updatedEmp = employees.find(emp => emp._id === selectedEmployee._id);
//     if (updatedEmp) {
//       setSelectedEmployee(updatedEmp); // update state with latest employee
//       setSelectedDepartments([updatedEmp.department?._id]);
//     }
//   }
// }, [employees]);


//   const handleActionClick = (emp) => {
//     setSelectedEmployee(emp);
//     setShowActionCard(true);
//   };

//   const handleSave = async() => {
//     let obj = {companyId:user?.companyId?._id, adminId:user?._id, employeeId:selectedEmployee?._id, departmentName: selectedDepartments[0]}
//     if(!obj?.companyId || !obj?.adminId || !obj?.departmentName || !obj?.employeeId) return toast({title:"Error", description:"requied fields missing.", variant:"destructive"})
//        setIsLoading(true);

//     // Optimistic update
//   setSelectedDepartmentEmployees(prev =>
//     prev.map(emp =>
//       emp._id === selectedEmployee._id
//         ? { ...emp, department: selectedDepartments[0] }
//         : emp
//     )
//   );
//     try{
//           const res = await updateEmployeeByDepartment(obj);
//           if(res){
//             socket.emit("addEmployeeRefresh");
//             socket.emit("addDepartmentRefresh", selectedEmployee?._id);
//             socket.emit("departmentRefresh", selectedEmployee?.department?._id)
//             toast({title:"Employee Department Updated.", description:res?.message});
//            await refreshList()
//           }
//       }
//       catch(err){
//       console.log(err);
//       toast({title:"Error", description:err?.response?.data?.message || err?.message || err?.res?.data, variant:"destructive"})
//       } finally{
//        setShowActionCard(false);
//        setIsLoading(false);
//       }

   
//   };
//   return (
//     // Overlay for center positioning + blur effect
//     <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50">
//       {/* Main Card */}
//       <div className="bg-white rounded-lg shadow-lg w-96 max-w-full max-h-[80vh] relative">
//         {/* Header */}
//         <div className="flex justify-between items-center p-4 border-b">
//           <div className="flex items-center gap-2">
//             <Briefcase className="w-5 h-5 text-primary" />
//             <h2 className="font-semibold text-lg">{departmentData.name}</h2>
//           </div>
//           <Button variant="ghost" onClick={onClose}>
//             Close
//           </Button>
//         </div>

//         {/* Employee List with scroll if height > 400px */}
//        <div className="p-4 max-h-[400px] overflow-y-auto">
//   {employees && employees.length > 0 ? (
//     <div className="space-y-3">
//       {employees.map((emp) => (
//         <div
//           key={emp._id}
//           className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition"
//         >
//           <User className="w-5 h-5 text-gray-500" />
//           <div className="flex items-center justify-between w-full">
//             <div>
//               <p className="font-medium">{emp.fullName}</p>
//               <p className="text-sm text-muted-foreground">{emp.designation}</p>
//             </div>
//             <button
//               className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
//               onClick={() => handleActionClick(emp)}
//             >
//               Change Department
//             </button>
//           </div>
//         </div>
//       ))}
//     </div>
//   ) : (
//     <div className="flex justify-center items-center h-32 text-muted-foreground font-medium">
//      Employees Not Found
//     </div>
//   )}
// </div>


//         {/* Action Card Popup */}
//         {showActionCard && selectedEmployee && (
//           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
//                           bg-white border rounded-lg shadow-2xl w-11/12 max-w-3xl p-6 z-50">
//             <h3 className="font-semibold text-xl mb-4">
//               Assign Department for {selectedEmployee.fullName}
//             </h3>
//             <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-6">
//               {departmentList.map((dept) => (
//                 <div key={dept?._id} className="flex items-center gap-2">
//                   <input type="checkbox" onChange={(e) => {
//         if (e.target.checked) {
//           setSelectedDepartments([dept.name]); // single select
//         } else {
//           setSelectedDepartments([]);
//         }
//       }} checked={selectedDepartments.includes(dept.name)}  id={dept?.name} className="accent-blue-500" />
//                   <label htmlFor={`dept-${dept._id}`} className="text-sm">
//                     {dept.name}
//                   </label>
//                 </div>
//               ))}
//             </div>
//             <div className="flex justify-end gap-3">
//               <Button variant="outline" onClick={() => setShowActionCard(false)}>
//                 Cancel
//               </Button>
//               <Button disabled={isLoading} onClick={handleSave}>
//                 {isLoading && <Loader2 className="sm:w-4 sm:h-4 w-5 h-5"/>}
//                 {isLoading ? "Updating...":"Update"}
//               </Button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default DepartmentCard;



























import React, { useEffect, useState } from "react";
import { Briefcase, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateEmployeeByDepartment } from "@/services/Service";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { socket } from "@/socket/socket";

const DepartmentCard = ({
  refreshList,
  departmentData,
  setSelectedDepartmentEmployees,
  employees,
  onClose,
  departmentList
}) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [showActionCard, setShowActionCard] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Set default selected department when employee selected
  useEffect(() => {
    if (selectedEmployee?.department?._id) {
      setSelectedDepartments([selectedEmployee.department._id]);
    }
  }, [selectedEmployee]);

  // Keep employee updated
  useEffect(() => {
    if (selectedEmployee && employees?.length > 0) {
      const updatedEmp = employees.find(
        (emp) => emp._id === selectedEmployee._id
      );
      if (updatedEmp) {
        setSelectedEmployee(updatedEmp);
        setSelectedDepartments([updatedEmp.department?._id]);
      }
    }
  }, [employees]);

  const handleActionClick = (emp) => {
    setSelectedEmployee(emp);
    setShowActionCard(true);
  };

  const handleSave = async () => {
    const obj = {
      companyId: user?.companyId?._id,
      adminId: user?._id,
      employeeId: selectedEmployee?._id,
      departmentId: selectedDepartments[0]
    };

    if (
      !obj.companyId ||
      !obj.adminId ||
      !obj.departmentId ||
      !obj.employeeId
    ) {
      return toast({
        title: "Error",
        description: "Required fields missing.",
        variant: "destructive"
      });
    }

    setIsLoading(true);

    // Optimistic update
    const selectedDeptObj = departmentList.find(
      (d) => d._id === selectedDepartments[0]
    );

    setSelectedDepartmentEmployees((prev) =>
      prev.map((emp) =>
        emp._id === selectedEmployee._id
          ? { ...emp, department: selectedDeptObj }
          : emp
      )
    );

    try {
      const res = await updateEmployeeByDepartment(obj);

      if (res) {
        socket.emit("addEmployeeRefresh");
        socket.emit("addDepartmentRefresh", selectedEmployee?._id);
        socket.emit("departmentRefresh", selectedDepartments[0]);

        toast({
          title: "Employee Department Updated",
          description: res?.message
        });

        await refreshList();
      }
    } catch (err) {
      console.log(err);
      toast({
        title: "Error",
        description:
          err?.response?.data?.message ||
          err?.message ||
          err?.res?.data,
        variant: "destructive"
      });
    } finally {
      setShowActionCard(false);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-96 max-w-full max-h-[80vh] relative">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">
              {departmentData.name}
            </h2>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        {/* Employee List */}
        <div className="p-4 max-h-[400px] overflow-y-auto">
          {employees?.length > 0 ? (
            <div className="space-y-3">
              {employees.map((emp) => (
                <div
                  key={emp._id}
                  className="flex items-center gap-3 p-2 rounded hover:bg-gray-100 transition"
                >
                  <User className="w-5 h-5 text-gray-500" />
                  <div className="flex items-center justify-between w-full">
                    <div>
                      <p className="font-medium">{emp.fullName}</p>
                      <p className="text-sm text-muted-foreground">
                        {emp.designation}
                      </p>
                    </div>
                    <button
                      className="bg-blue-500 text-white px-3 py-1 text-sm rounded hover:bg-blue-600"
                      onClick={() => handleActionClick(emp)}
                    >
                      Change Department
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex justify-center items-center h-32 text-muted-foreground font-medium">
              Employees Not Found
            </div>
          )}
        </div>

        {/* Action Modal */}
        {showActionCard && selectedEmployee && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 
            bg-white border rounded-lg shadow-2xl w-11/12 max-w-3xl p-6 z-50">

            <h3 className="font-semibold text-xl mb-4">
              Assign Department for {selectedEmployee.fullName}
            </h3>

            <div className="grid grid-cols-2 gap-4 max-h-96 overflow-y-auto mb-6">
              {departmentList.map((dept) => (
                <div key={dept._id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`dept-${dept._id}`}
                    className="accent-blue-500"
                    checked={selectedDepartments.includes(dept._id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDepartments([dept._id]);
                      } else {
                        setSelectedDepartments([]);
                      }
                    }}
                  />
                  <label htmlFor={`dept-${dept._id}`} className="text-sm">
                    {dept.name}
                  </label>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setShowActionCard(false)}
              >
                Cancel
              </Button>

              <Button disabled={isLoading} onClick={handleSave}>
                {isLoading && (
                  <Loader2 className="w-4 h-4 animate-spin mr-1" />
                )}
                {isLoading ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DepartmentCard;