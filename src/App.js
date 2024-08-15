import React, { useState, useEffect } from "react";
import "./App.css";
import Lottie from "lottie-react";
import {
  storage,
  authentication,
  signInAnonymously,
  appCheck,
} from "./firebase";
import { ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";
import heic2any from "heic2any";
import { nanoid } from "nanoid";
import Swal from "sweetalert2";
import Resizer from "react-image-file-resizer";
import uploadingAnimation from "./animation/uploadingAnimation.json";

function App() {
  const [file, setFile] = useState(null); // Stores the image files
  const [fileCount, setFileCount] = useState(0); // Stores the number of Images
  const [uploading, setUploading] = useState(false);

  const imagesListRef = ref(storage, "images/"); // The file on firebase starts in the images folder

  const signInAnonymouslyHandler = async () => {
    try {
      await signInAnonymously(authentication);
    } catch (error) {
      console.error("Error signing in anonymously:", error);
      Swal.fire({
        icon: "error",
        title: "Failed to authenticate!",
        showConfirmButton: true,
      });
    }
  };

  useEffect(() => {
    const authenticateAndFetchImages = async () => {
      if (!authentication.currentUser) {
        await signInAnonymouslyHandler();
      }
    };
    authenticateAndFetchImages();
  }, [authentication.currentUser, imagesListRef]);

  const resizeFile = (file) => {
    return new Promise((resolve) => {
      Resizer.imageFileResizer(
        file,
        504,
        504,
        "PNG",
        60,
        0,
        (uri) => {
          resolve(uri);
        },
        "blob"
      );
    });
  };

  async function handleUpload() {
    setUploading(true);

    if (!authentication.currentUser) {
      await signInAnonymouslyHandler();
    }

    if (file == null) {
      Swal.fire({
        icon: "error",
        title: "No image selected!",
        showConfirmButton: true,
      }); // No file selected
      setUploading(false);
      return;
    }
    // const token = await getToken(appCheck);
    // console.log(token);

    let fileExtension = file.name.split(".").pop().toLowerCase();

    if (
      !["png", "jpeg", "jpg", "heic", "webp", "heif"].includes(fileExtension)
    ) {
      // File must be an image of one of these types
      Swal.fire({
        icon: "error",
        title: "Only PNG, JPG, WEBP, HEIF and HEIC image files are allowed!",
        showConfirmButton: true,
      }); // Incorrect File type selected
      setFile(null);
      setUploading(false);
      return;
    }

    let fileToProcess = file;
    let resizedFile = file;

    try {
      if (fileExtension === "heic") {
        // It's the converting from HEIC file which takes a while
        const heicFile = await heic2any({
          blob: fileToProcess,
          toType: "image/png",
        });
        fileToProcess = heicFile;
        fileExtension = "png";

        resizedFile = await resizeFile(fileToProcess);
      }

      const randomString = nanoid(8);
      const imageReference = ref(
        storage,
        "images/image" + fileCount + randomString + "." + fileExtension
      ); // Create the reference, include the number or name

      await uploadBytes(imageReference, resizedFile).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((url) => {
          setFileCount((prevCount) => prevCount + 1);
        });
      });

      // Fire an alert
      Swal.fire({
        icon: "success",
        title: "Your Image has been Uploaded!",
        showConfirmButton: true,
      });
      setFile(null);
      setUploading(false);
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "Failed to upload image!",
        showConfirmButton: true,
      });
    }
  }

  function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  return (
    <div className="App">
      <div className="container">
        <h1>File Uploader</h1>
        <label className="custom-file-upload">
          <input type="file" onChange={handleFileChange} />
          Choose File{" "}
        </label>
        {file ? `Selected File: ${file.name}` : "No File Selected"}
        <br />
        <br />
        <button onClick={handleUpload} disabled={uploading}>
          Upload Image
        </button>
        {uploading && (
          <Lottie
            animationData={uploadingAnimation}
            style={{ width: 125, height: 125 }}
          ></Lottie>
        )}
      </div>
    </div>
  );
}

export default App;
