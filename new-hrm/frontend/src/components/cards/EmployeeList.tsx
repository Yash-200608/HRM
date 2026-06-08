import React from "react";


interface Props {
    open: boolean;
    onClose: () => void;
    data: any[];
}

const EmployeeListModal: React.FC<Props> = ({ open, onClose, data }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">

            {/* Background blur */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Center Card */}
            <div className="relative bg-white w-[90%] max-w-md rounded-xl shadow-lg p-5 z-10">

                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold">All Employees</h2>
                    <button
                        onClick={onClose}
                        className="text-sm text-gray-500 hover:text-black"
                    >
                        ✕
                    </button>
                </div>

                {/* List */}
                <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {data?.length > 0 ? (
                        data.map((emp, idx) => (
                            <div
                                key={idx}
                                className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-100"
                            >
                                {/* Avatar */}
                                {emp.profileImage ? (
                                    <img
                                        src={emp.profileImage}
                                        alt="profile"
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold">
                                        {emp.fullName?.charAt(0)?.toUpperCase()}
                                    </div>
                                )}

                                {/* Info */}
                                <div>
                                    <p className="font-medium text-sm">{emp.fullName}</p>
                                    <p className="text-xs text-gray-500">
                                        {emp.department?.name || "No Department"}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 text-center">
                            No employees found
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmployeeListModal;