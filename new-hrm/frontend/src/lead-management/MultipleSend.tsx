import { Button } from "@/components/ui/button";
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Paperclip, X } from "lucide-react";
import { useRef, useState } from "react";
import { addMessage, getMessage } from "@/services/Service";



const MultipleSend = ({isOpen, onOpenChange, selectedUsers, setSelectedUsers}) => {
    const {user} = useAuth();
    const {toast} = useToast();
    const [message, setMessage] = useState("");
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const fileRef = useRef(null);
    const handleImageChange = (e) => {
        const selectedFile = e.target.files?.[0];
        if(selectedFile){
            setFile(selectedFile);
            setPreview(URL.createObjectURL(selectedFile));
        }
    }

    const handleSubmit = async () => {
        let obj = { message: message, userId: user?._id, leadId: selectedUsers, media: file };
        const formData = new FormData();
        Object?.entries(obj)?.forEach(([k, v]) => {
          if (v) {
            formData.append(k, v)
          }
        })
        setIsLoading(true);
    
        try {
          const res = await addMessage(formData);
          if (res.status === 200 || res.status===201) {
            // setMessageListRefresh(true);
            setSelectedUsers([]);
            onOpenChange(false);
          }
    
        }
        catch (err) {
          console.log(err);
        }
        finally {
          setIsLoading(false);
          setFile(null);
          setPreview(null);
          setMessage("");
        }
      }

   return(
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange} >
        <DialogContent>
            <DialogHeader>Multiple User Message Send</DialogHeader>
            {/* <DialogDescription>Multiple User Message Send</DialogDescription> */}
            <div className="w-full h-px bg-gray-500"/>
            <Label>Message</Label>
            <Textarea onChange={(e)=>{setMessage(e.target.value)}} value={message}/>
            
            {file && preview && (
            <div className="fixed inset-0 flex items-center justify-center rounded-lg bg-black/40 backdrop-blur-sm z-50">

              <div className="relative bg-white rounded-xl shadow-lg p-4 max-w-lg w-full">

                {/* Close Button */}
                <button
                  onClick={() => { setFile(null); setPreview(null); if(fileRef.current){fileRef.current.value = ""}}}
                  className="absolute top-3 right-3 text-red-500 bg-black/80 rounded-full p-1 hover:bg-black"
                >
                  <X size={20} />
                </button>

                {/* File Preview */}
                <div className="w-full max-h-[50vh] flex items-center justify-center">
                  {file.type.startsWith("image/") && (
                    <img
                      src={preview}
                      alt="preview"
                      className="w-full max-h-[50vh] rounded-lg object-contain"
                    />
                  )}

                  {file.type.startsWith("video/") && (
                    <video
                      src={preview}
                      controls
                      className="w-full max-h-[50vh] rounded-lg"
                    />
                  )}

                  {file.type.startsWith("audio/") && (
                    <audio src={preview} controls className="w-full" />
                  )}

                  {file.type === "application/pdf" && (
                    <div className="flex items-center justify-center w-full h-32 border border-gray-300 rounded-lg bg-gray-100">
                      <p className="text-gray-700 font-medium">{file.name}</p>
                    </div>
                  )}
                </div>

                {/* Buttons */}
                <div className="flex justify-end gap-2 mt-4">
                  <Button
                    variant="outline"
                    onClick={() => { setFile(null); setPreview(null); if(fileRef.current){fileRef.current.value = ""} }}
                  >
                    Cancel
                  </Button>

                  <Button variant="default" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin text-blue-500 w-6 h-6" />}
                    {isLoading ? "Sending..." : "Send"}
                  </Button>
                </div>

              </div>

            </div>
          )}

            <DialogFooter>
                {/* y file select karne ka hai  */}
                <Input type="file" ref={fileRef} onChange={handleImageChange} id="file_select_id" className="hidden" />
                <Button onClick={()=>{document?.getElementById("file_select_id")?.click()}}><Paperclip /></Button>
                <Button disabled={!message} onClick={handleSubmit}>
                   {isLoading && <Loader2 className="animate-spin text-blue-500 w-6 h-6" />}
                    {isLoading ? "Sending..." : "Send"}
                    </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
   )
};

export default MultipleSend;