import cloudinary from "cloudinary";

export const cloudinaryConnect = async () => {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
        throw new Error("Cloudinary credentials are not fully configured");
    }

    cloudinary.v2.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.v2.api.ping();
    if (result?.status !== "ok") {
        throw new Error("Cloudinary health check failed");
    }

    console.log("Cloudinary Connected Successfully");
};