
import React from "react";
import {
  MoreVertical,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Building2,
  Badge
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface AdminListCardProps {
  adminList?: any[];
  setAdminInitialData: (admin: any) => void;
  setIsEditDialogOpen: (val: boolean) => void;
  setIsAdminDialog: (val: boolean) => void;
  handleDeleteClick: (id: string) => void;
  handleStatusChange?: (id: string, status: true | false) => void;
}

const AdminListCard: React.FC<AdminListCardProps> = ({
  adminList = [],
  setAdminInitialData,
  setIsEditDialogOpen,
  setIsAdminDialog,
  handleDeleteClick,
  handleStatusChange
}) => {
  const filterAdmins = adminList?.filter((admin)=> admin?.role !== "super_admin");
  if (!filterAdmins.length) {
    return (
      <p className="text-center pt-36 text-muted-foreground">No admins found.</p>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {filterAdmins?.map((admin) => (
          <div
            key={admin._id}
            className="border rounded-lg p-4 shadow-sm hover:shadow-md transition relative"
          >
            {/* Top Right Menu */}
            <div className="absolute top-3 right-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end">
                  {/* Edit */}
                  <DropdownMenuItem
                    onClick={() => {
                      setAdminInitialData(admin);
                      setIsEditDialogOpen(true);
                      setIsAdminDialog(true);
                    }}
                    className="cursor-pointer"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>

                  {/* Delete */}
                  <DropdownMenuItem
                    onClick={() => handleDeleteClick?.(admin._id)}
                    className="text-destructive cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>

                  {/* Status Change (hover to show) */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="cursor-pointer flex items-center justify-between">
                      Status
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={admin?.isActive===true}
                        onClick={() =>
                          handleStatusChange?.(admin._id, true)
                        }
                      >
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem
                       className="cursor-pointer"
                      disabled={admin?.isActive===false}
                        onClick={() =>
                          handleStatusChange?.(admin._id, false)
                        }
                      >
                        Inactive
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                {admin.profileImage ? (
                  <img
                    src={admin.profileImage}
                    alt={admin.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-semibold text-primary">
                    {admin.username?.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-semibold">{admin.username}</h4>
              {/* Status */}
    <div
      className={`text-xs px-2 py-0.5 rounded-full font-medium w-max
        ${admin?.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}
      `}
    >
      {admin?.isActive ? "Active" : "In-Active"}
    </div>

              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="break-all">{admin.email}</p>

              {admin.mobile && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>Mobile:- {admin.mobile}</span>
                </div>
              )}

              {admin.address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 mt-0.5" />
                  <span>Address:- {admin.address}</span>
                </div>
              )}

              {admin.companyId?.name && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  <span>Company Name:- {admin.companyId?.name}</span>
                </div>
              )}
            </div>
          </div>
        ))}
    </div>
  );
};

export default AdminListCard;
