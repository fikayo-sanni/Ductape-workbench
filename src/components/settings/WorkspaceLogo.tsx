import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import workspaceServices from "@/services/workspaceServices";

interface WorkspaceLogoProps {
  initialLogo?: string;
  workspaceName?: string;
  onLogoChange: (logoUrl: string) => void;
}

export function WorkspaceLogo({
  initialLogo,
  workspaceName,
  onLogoChange,
}: WorkspaceLogoProps) {
  const [logoUrl, setLogoUrl] = useState(initialLogo);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadLogoMutation = useMutation({
    mutationFn: workspaceServices.createUploadUrl,
    onMutate: () => {
      toast.loading("Uploading logo...", { id: "logoUpload" });
    },
    onSuccess: async (data, variables) => {
      const { url, key } = data.data;
      if (url) {
        try {
          await workspaceServices.uploadFileToUrl({
            url,
            file: variables.file,
          });
          setLogoUrl(key);
          onLogoChange(key);
          toast.success("Logo uploaded successfully", { id: "logoUpload" });
        } catch (error) {
          console.error("Error uploading file:", error);
          toast.error("Error uploading file", { id: "logoUpload" });
        }
      }
    },
    onError: (error) => {
      console.error("Error creating upload URL:", error);
      toast.error(`Error creating upload URL: ${error}`, { id: "logoUpload" });
    },
  });

  const handleLogoChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    uploadLogoMutation.mutate({
      fileType: file.type,
      visibility: "public",
      id: "workspace-logo",
      file,
    });
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const getInitial = (name?: string) => {
    if (!name) return 'W';
    return name.trim().charAt(0).toUpperCase();
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar className="h-24 w-24 bg-primary">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt="Workspace logo"
            className="h-full w-full object-cover rounded-full"
          />
        ) : (
          <AvatarFallback className="bg-blue-500 dark:bg-blue-500/80 text-white dark:text-white text-2xl font-bold">
            {getInitial(workspaceName)}
          </AvatarFallback>
        )}
      </Avatar>
      <div className="flex flex-col gap-2">
        <h2 className="font-bold text-grey">Workspace Logo</h2>
        <input
          ref={fileInputRef}
          id="logo-upload"
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleLogoChange}
          disabled={uploadLogoMutation.isPending}
        />
        <Button
          type="button"
          variant="outline"
          className="text-primary text-base font-semibold"
          disabled={uploadLogoMutation.isPending}
          onClick={handleButtonClick}
        >
          Change Logo
        </Button>
      </div>
    </div>
  );
}

