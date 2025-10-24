/* Imports */
import { useEffect, type JSX } from "react";

/* Relative Imports */
import { useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

/* Local Imports */
import AdminDashboardPage from "@/components/page/adminDashboardPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import ButtonLoader from "@/components/loader/inlineLoader";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import AdminDashboardFormLayout from "@/layout/adminDashboardLayout/components/adminDashboardFormLayout";
import { PAGE_ADMIN_DASHBOARD } from "@/routes/paths";
import { useCamera } from "@/hooks/dashboard/use-camera";
import {
  CameraFormSchema,
  type CameraFormValues,
} from "@/models/admin-dashboard/camera";

// ----------------------------------------------------------------------

/**
 * Component to create the form to create/update a camera.
 *
 * @component
 * @returns {JSX.Element}
 */

const CreateCamera = (): JSX.Element => {
  /* Constants */
  const manageCameraPath = PAGE_ADMIN_DASHBOARD.cameras.absolutePath;

  /* Hooks */
  const { id } = useParams();
  const navigate = useNavigate();
  const { createCameraMutation, updateCameraMutation, getCameraByIdMutation } =
    useCamera();

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(CameraFormSchema),
    defaultValues: {
      txtName: "",
      txtRtspUrl: "",
      txtLocation: "",
      txtDescription: "",
      txtResolution: "",
      txtFps: undefined,
      chkIsActive: true,
    },
  });

  /* Functions */
  /**
   * function to get the camera by id with backend action
   * @param {string} cameraId - id of the camera to fetch the detail
   * @returns {void}
   */
  const getCameraById = async (cameraId: string): Promise<void> => {
    const response = await getCameraByIdMutation.mutateAsync(cameraId);

    const cameraData = response?.data?.camera;
    console.log("data", cameraData);
    form.reset({
      txtName: cameraData.name,
      txtRtspUrl: cameraData.rtspUrl,
      txtLocation: cameraData.location || "",
      txtDescription: cameraData.description || "",
      txtResolution: cameraData.resolution || "",
      txtFps: cameraData.fps || undefined,
      chkIsActive: cameraData.isActive,
    });
  };

  /**
   * Submit function to save/update camera with backend action
   * @param {CameraFormValues} values - input values of form
   * @returns {void}
   */
  const handleFormSubmit = async (values: CameraFormValues): Promise<void> => {
    console.log("values", values);
    if (id) {
      await updateCameraMutation.mutateAsync({
        cameraId: id,
        reqData: {
          name: values.txtName,
          rtspUrl: values.txtRtspUrl,
          location: values.txtLocation,
          description: values.txtDescription,
          resolution: values.txtResolution,
          fps: values.txtFps,
          isActive: values.chkIsActive,
        },
      });
    } else {
      await createCameraMutation.mutateAsync({
        name: values.txtName,
        rtspUrl: values.txtRtspUrl,
        location: values.txtLocation,
        description: values.txtDescription,
        resolution: values.txtResolution,
        fps: values.txtFps,
        isActive: values.chkIsActive,
      });
    }
    navigate(manageCameraPath);
  };

  /**
   * function to handle back button click
   * @returns {void}
   */
  const handleBack = () => {
    navigate(manageCameraPath);
  };

  /* Side-Effects */
  useEffect(() => {
    if (id) {
      getCameraById(id);
    }
  }, [id]);

  /* Output */
  return (
    <AdminDashboardPage title={id ? "Update Camera" : "Create Camera"}>
      {!getCameraByIdMutation?.isPending ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="w-full h-full"
          >
            <AdminDashboardFormLayout
              title={id ? "Update Camera" : "Create Camera"}
              description={
                id
                  ? "Please update the details below to update camera"
                  : "Please fill the below details to create new camera"
              }
              footer={
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={
                      createCameraMutation?.isPending ||
                      updateCameraMutation?.isPending
                    }
                    size="lg"
                  >
                    {id ? "Cancel" : "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      createCameraMutation?.isPending ||
                      updateCameraMutation?.isPending
                    }
                    size="lg"
                  >
                    {createCameraMutation?.isPending ||
                    updateCameraMutation?.isPending ? (
                      <div className="flex items-center justify-between gap-2">
                        <ButtonLoader />
                        {id ? "Updating..." : "Creating..."}
                      </div>
                    ) : id ? (
                      "Update Camera"
                    ) : (
                      "Create Camera"
                    )}
                  </Button>
                </>
              }
            >
              {/* Camera Name */}
              <FormField
                control={form.control}
                name="txtName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Camera Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter camera name"
                        {...field}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* RTSP URL */}
              <FormField
                control={form.control}
                name="txtRtspUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RTSP URL</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter RTSP URL"
                        {...field}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="txtLocation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter location"
                        {...field}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="txtDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter description"
                        {...field}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Resolution */}
              <FormField
                control={form.control}
                name="txtResolution"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resolution</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter resolution (e.g., 1920x1080)"
                        {...field}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* FPS */}
              <FormField
                control={form.control}
                name="txtFps"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>FPS</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter FPS"
                        value={field.value === 0 ? "" : field.value}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "") {
                            field.onChange(undefined);
                          } else {
                            const num = Number(value);
                            if (!isNaN(num)) field.onChange(num);
                          }
                        }}
                        min="1"
                        max="60"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Status */}
              <FormField
                control={form.control}
                name="chkIsActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 cursor-pointer">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Active Status</FormLabel>
                      <FormDescription>
                        {field.value
                          ? "Camera is active and can stream video"
                          : "Camera is inactive and cannot stream video"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="cursor-pointer"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </AdminDashboardFormLayout>
          </form>
        </Form>
      ) : (
        <div className="flex items-center justify-center h-64">
          <ButtonLoader />
        </div>
      )}
    </AdminDashboardPage>
  );
};

export default CreateCamera;
