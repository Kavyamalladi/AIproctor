import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

const configureCloudinary = () => {
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY , 
        api_secret: process.env.CLOUDINARY_API_SECRET 
    });
};

const uploadOnCloudinary = async(filePath)=>{
    configureCloudinary();
    
    try {
       if(!filePath){
        return null
       } 
       const uploadResult = await cloudinary.uploader.upload(filePath, {resource_type:'auto'})
       fs.unlinkSync(filePath)
       return uploadResult.secure_url
    } catch (error) {
        fs.unlinkSync(filePath)
        console.log(error); 
    }
}

// Upload documents (PDF, DOC, etc.) - ensure public access
export const uploadDocumentToCloudinary = async (filePath, originalName) => {
    configureCloudinary();
    
    try {
        if (!filePath) {
            return null;
        }
        
        // Get file extension
        const ext = originalName?.split('.').pop()?.toLowerCase() || '';
        
        // Upload with settings that maximize public accessibility
        const uploadResult = await cloudinary.uploader.upload(filePath, {
            resource_type: 'auto',
            folder: 'assignments',
            use_filename: true,
            unique_filename: true,
            public_id: `${Date.now()}-${originalName?.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_')}`,
            access_mode: 'public',
            type: 'upload',
            overwrite: true,
            invalidate: true
        });
        
        console.log('Document uploaded successfully:', uploadResult.secure_url);
        console.log('Resource type:', uploadResult.resource_type);
        console.log('Public ID:', uploadResult.public_id);
        console.log('URL:', uploadResult.url);
        
        fs.unlinkSync(filePath);
        return uploadResult.secure_url;
    } catch (error) {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        console.error('Cloudinary document upload error:', error);
        return null;
    }
};

// Download file from Cloudinary using authenticated API call
export const downloadFromCloudinary = async (publicUrl) => {
    configureCloudinary();
    
    try {
        if (!publicUrl) return null;
        
        // Extract public_id from URL
        // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{folder}/{filename}
        const urlParts = publicUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex === -1) return null;
        
        const resourceType = urlParts[uploadIndex - 1]; // 'raw', 'image', 'video'
        const publicIdParts = urlParts.slice(uploadIndex + 1).join('/');
        const publicId = publicIdParts.replace(/^v\d+\//, ''); // Remove version prefix
        
        // Generate a direct download URL
        // For raw files, we need to construct the URL with authentication
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        // Use cloudinary.utils to sign the URL
        const signature = cloudinary.utils.api_sign_request(
            { public_id: publicId, timestamp: timestamp },
            process.env.CLOUDINARY_API_SECRET
        );
        
        // Construct authenticated URL
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        
        // For raw resources, use the admin API endpoint or signed URL
        const downloadUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/${publicIdParts}`;
        
        return {
            url: downloadUrl,
            publicId: publicId,
            resourceType: resourceType
        };
    } catch (error) {
        console.error('Error preparing download:', error);
        return null;
    }
};

// Generate a download URL for a Cloudinary resource
export const getSignedUrl = (publicUrl) => {
    configureCloudinary();
    
    try {
        if (!publicUrl) return null;
        
        // For Cloudinary URLs, we can add fl_attachment to force download
        // and use the API to generate a signed URL if needed
        
        // Extract public_id and resource_type from the URL
        // URL format: https://res.cloudinary.com/{cloud_name}/{resource_type}/upload/v{version}/{public_id}
        const urlParts = publicUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        
        if (uploadIndex === -1) return publicUrl;
        
        // Get resource type (image, video, raw)
        const resourceType = urlParts[uploadIndex - 1];
        
        // Get public_id (everything after version, including folder)
        const versionAndAfter = urlParts.slice(uploadIndex + 1).join('/');
        // Remove version prefix if present (e.g., v1234567890/)
        const publicId = versionAndAfter.replace(/^v\d+\//, '');
        
        // Generate a properly signed URL using cloudinary.url
        const signedUrl = cloudinary.url(publicId, {
            resource_type: resourceType,
            type: 'upload',
            secure: true,
            sign_url: true,
            attachment: true  // This adds fl_attachment for download
        });
        
        return signedUrl;
    } catch (error) {
        console.error('Error generating signed URL:', error);
        return publicUrl; // Fall back to original URL
    }
};

// Upload base64 image to cloudinary
export const uploadBase64ToCloudinary = async (base64Data, folder = 'proctoring_screenshots') => {
    configureCloudinary();
    
    try {
        if (!base64Data) return null;
        
        const uploadResult = await cloudinary.uploader.upload(base64Data, {
            resource_type: 'image',
            folder: folder,
            transformation: [{ quality: 'auto', fetch_format: 'auto' }]
        });
        
        return uploadResult.secure_url;
    } catch (error) {
        console.error('Cloudinary base64 upload error:', error);
        return null;
    }
};

export default uploadOnCloudinary