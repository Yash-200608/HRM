import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import React, { useEffect, useRef, useState } from "react";
import { socket } from "@/socket/socket";
import { getCurrentHourAndMinute } from "@/services/allFunctions";
import { addMessage, getMessage } from "@/services/Service";
import { Loader2, Paperclip, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const MessageCard = ({ isOpen, onOpenChange, userData }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState<string>("");
  const [messageList, setMessageList] = useState<any>([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [messageListRefresh, setMessageListRefresh] = useState(false);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    socket.on("new-message", (data) => {
      setMessageListRefresh(true)
    });

    return () => {
      socket.off("new-message")
    }

  }, []);

  useEffect(() => {
    if (messageContainerRef && messageContainerRef.current) {
      messageContainerRef.current.scrollTo({ top: messageContainerRef.current.scrollHeight, behavior: "smooth" })
    }
  }, [messageList.length]);

  const handleChangeFile = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
    }
  };


  const handleGetData = async () => {
    if (!userData?._id) return;
    try {
      const res = await getMessage(userData?._id);
      if (res?.status === 200) {
        setMessageList(res?.data?.messageData);
        setMessageListRefresh(false)
      }

    }
    catch (err) {
      console.log(err?.response?.data?.message || err?.message);
    }
  }

  useEffect(() => {
    handleGetData()
  }, [isOpen, userData?._id, messageListRefresh])

  const handleSubmit = async () => {
    let obj = { message: message, userId: user?._id, leadId: userData?._id, media: file };
    const formData = new FormData();
    Object?.entries(obj)?.forEach(([k, v]) => {
      if (v) {
        formData.append(k, v)
      }
    })
    setIsLoading(true);

    try {
      const res = await addMessage(formData);
      if (res.status === 201) {
        setMessageListRefresh(true)
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
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange} >
        <DialogContent className="bg-amber-50">
          <DialogHeader >
            <div className="flex">
              <div className="flex justify-between">
                <div className="w-12 h-12 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-lg">
                  {userData?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="ml-2 mt-3">{userData?.name}</div>
              </div>
            </div>
          </DialogHeader>
          <DialogDescription> <div className="w-full h-px bg-gray-300" /></DialogDescription>
          <div className="min-h-[400px] max-h-[400px] overflow-y-auto card-scroll" ref={messageContainerRef}>
            {messageList.map((m, index) => {
              const messageDate = new Date(m.time);
              const today = new Date();

              // check if this message is on the same day as today
              const isToday = messageDate.toDateString() === today.toDateString();

              // check if we need to show date separator
              let showDateSeparator = false;
              if (index === 0) {
                showDateSeparator = true; // first message always show
              } else {
                const prevMessageDate = new Date(messageList[index - 1].time); // yha index-1 isliye kiya hai taki current message ko previouse message s compare karke pata chale ki ya today ka hai ya nhi
                if (prevMessageDate.toDateString() !== messageDate.toDateString()) {
                  showDateSeparator = true; // different day than previous message
                }
              }
              return (
                <React.Fragment key={m._id || index}>
                  {/* Date Separator */}
                  {showDateSeparator && (
                    <div className="flex justify-center my-2">
                      <span className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full">
                        {isToday
                          ? "Today"
                          : messageDate.toLocaleDateString(undefined, {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                      </span>
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div className={m?.sender === "user" ? "flex justify-start" : "flex justify-end"}>
                    <div className={
                      m?.sender === "user"
                        ? "bg-gray-400 mt-2 ml-2 text-white rounded-lg max-w-[75%] p-2 inline-block"
                        : "bg-blue-500 text-white p-2 mt-2 rounded-lg max-w-[30%] inline-block mr-1"
                    }
                    >
                      {m?.media ? (
                        <>
                          {m?.type?.startsWith("image/") && (
                            <img src={m?.media} alt="image" className="w-full max-h-60 rounded-lg object-contain" />
                          )}
                          {m?.type?.startsWith("video/") && (
                            <video src={m?.media} controls className="w-full max-h-60 rounded-lg" />
                          )}
                          {m?.type?.startsWith("audio/") && (
                            <audio src={m?.media} controls className="w-full" />
                          )}
                          {m?.type === "application/pdf" && (
                            <div className="flex items-center justify-center w-full h-20 border border-gray-300 rounded-lg bg-gray-100 text-gray-700">
                              <p className="text-sm font-medium">{m?.message || "PDF Document"}</p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="break-words font-extralight">{m?.message}</div>
                      )}
                      <div className="text-[10px] text-right">{getCurrentHourAndMinute(m?.time)}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>

          {file && preview && (
            <div className="fixed inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-50">

              <div className="relative bg-white rounded-xl shadow-lg p-4 max-w-lg w-full">

                {/* Close Button */}
                <button
                  onClick={() => { setFile(null); setPreview(null); }}
                  className="absolute top-3 right-3 text-red-500 bg-black/80 rounded-full p-1 hover:bg-black"
                >
                  <X size={20} />
                </button>

                {/* File Preview */}
                <div className="w-full max-h-[70vh] flex items-center justify-center">
                  {file.type.startsWith("image/") && (
                    <img
                      src={preview}
                      alt="preview"
                      className="w-full max-h-[70vh] rounded-lg object-contain"
                    />
                  )}

                  {file.type.startsWith("video/") && (
                    <video
                      src={preview}
                      controls
                      className="w-full max-h-[70vh] rounded-lg"
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
                    onClick={() => { setFile(null); setPreview(null); }}
                  >
                    Cancel
                  </Button>

                  <Button variant="default" onClick={handleSubmit} disabled={isLoading}>
                    {isLoading && <Loader2 className="animate-spin text-blue-500 w-6 h-6" />}
                    {isLoading ? "Submiting..." : "Submit"}
                  </Button>
                </div>

              </div>

            </div>
          )}
          <DialogFooter>
            {/* <div className="flex"> */}
            <div className="flex justify-between w-full">
              <Input placeholder="Enter Your Text" value={message} onChange={(e) => { setMessage(e.target.value) }} onKeyDown={(e) => { if (e.key === "Enter") { handleSubmit() } }} />
              {/* y media file select k liye hai  */}
              <Input type="file" onChange={handleChangeFile} id="file_type_input" placeholder="Enter Your Text" className="hidden" accept="image/*,video/*,audio/*,application/pdf" />
              <Button className="ml-3 bg-blue-500 text-white" onClick={() => { document?.getElementById("file_type_input")?.click() }} ><Paperclip /></Button>
              <Button className="ml-3 bg-blue-500 text-white" onClick={handleSubmit} disabled={isLoading || !message} >
                {isLoading && <Loader2 />}
                {isLoading ? "Chating..." : "Chat"}
              </Button>
            </div>
            {/* </div> */}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}


export default MessageCard;