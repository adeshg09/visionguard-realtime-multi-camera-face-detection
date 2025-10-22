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
import ButtonLoader from "@/components/loader/inlineLoader";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
  const { createCameraMutation, updateCameraMutation, GetCameraByIdMutation } =
    useCamera();

  const form = useForm<CameraFormValues>({
    resolver: zodResolver(CameraFormSchema),
    defaultValues: {
      txtName: "",
      txtRtspUrl: "",
      txtLocation: "",
      txtDescription: "",
      txtResolution: "",
      txtFps: 0,
    },
  });

  /* Functions */
  /**
   * function to get the camera by id with backend action
   * @param {string} cameraId - id of the camera to fetch the detail
   * @returns {void}
   */
  const getCameraById = async (cameraId: string): Promise<void> => {
    await GetCameraByIdMutation.mutateAsync(cameraId, {
      onSuccess: (data: any) => {
        const editCameraData = data?.data;
        form.reset({
          txtName: editCameraData?.name,
          txtRtspUrl: editCameraData?.rtspUrl,
          txtLocation: editCameraData?.location,
          txtDescription: editCameraData?.description,
          txtResolution: editCameraData?.resolution,
          txtFps: editCameraData?.fps,
        });
      },
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
    <AdminDashboardPage title="Create Camera">
      {!GetCameraByIdMutation?.isPending ? (
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="w-full h-full"
          >
            <AdminDashboardFormLayout
              title="Create Camera"
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
                    disabled={createCameraMutation.isPending}
                    size="lg"
                  >
                    {id ? "Cancel" : "Back"}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createCameraMutation.isPending}
                    size="lg"
                  >
                    {createCameraMutation.isPending ? (
                      <div className="flex items-center justify-between gap-2">
                        <ButtonLoader />
                        {id ? "Updating..." : "Creating..."}
                      </div>
                    ) : id ? (
                      "Update"
                    ) : (
                      "Create"
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
                        placeholder="Enter resolution"
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
                      />
                    </FormControl>
                    <FormMessage />
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
