import React from "react";
import { Button } from '@/components/ui/button';

const DeleteCard = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  isDeleting = false,
  title = "Are you sure?",
  message = "This action will permanently delete the item."
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[1000]">
      {/* Blur background */}
      <div 
        className="absolute inset-0 backdrop-blur-sm bg-black/30 z-[1000]" 
        onClick={onClose} // click outside closes modal
      ></div>

      {/* Delete Modal Card */}
      <div className="relative bg-white rounded-lg shadow-lg p-6 w-96 z-[1100]">
        <h2 className="text-lg font-bold mb-2">{title}</h2>
        <p className="mb-4 text-sm text-gray-600">{message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            No
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? "Deleting..." : "Yes"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCard;
