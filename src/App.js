import React, { useState, useEffect } from "react";
import "./App.css";
import Lottie from "lottie-react";
import { storage, authentication, signInAnonymously } from "./firebase";
import { ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";
import heic2any from "heic2any";
import { nanoid } from "nanoid";
import Swal from "sweetalert2";
import imageCompression from "browser-image-compression";
import uploadingAnimation from "./animation/uploadingAnimation.json";

function App() {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const [file, setFile] = useState(null); // Stores the image files
  const [fileCount, setFileCount] = useState(0); // Stores the number of Images
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState("");
  const [firebaseToken, setFirebaseToken] = useState("");

  useEffect(() => {
    async function authenticateUser() {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get("token");
        setToken(token);

        // sign in the user first to the user
        if (!authentication.currentUser) {
          await signInAnonymouslyHandler();
        }

        const fileRef = ref(storage, "code/dailycode");

        const url = await getDownloadURL(fileRef);

        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const byteArray = new Uint8Array(buffer);
        setFirebaseToken(String.fromCharCode(...byteArray));
      } catch (error) {
        console.error("Error during fetch or authentication:", error);
      }
    }
    authenticateUser();
  }, []);

  //Signs the user annonymously into the firebase
  async function signInAnonymouslyHandler() {
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
  }

  //Set the file to the selected file change
  function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  async function compressImage(file) {
    const options = {
      maxSizeMB: 0.2, // desired max size in MB
      maxWidthOrHeight: 1008,
      useWebWorker: false,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      return compressedFile;
    } catch (error) {
      console.error("Error during image compression:", error);
      return "error";
    }
  }

  //Handle the upload of the image to the firebase
  async function handleUpload() {
    //Uploading image
    setUploading(true);

    //If not authenticated sign in again
    if (authentication.currentUser) {
      console.log("Authenticated");
    }
    if (!authentication.currentUser) {
      await signInAnonymouslyHandler();
    }

    //No Image selected, through error
    if (file == null) {
      Swal.fire({
        icon: "error",
        title: "No image selected!",
        showConfirmButton: true,
      }); // No file selected
      setUploading(false);
      return;
    }

    //Get the extension of the file
    let fileExtension = file.name.split(".").pop().toLowerCase();

    //If extension is not one of the below file types then it is not an image
    // so throw an error
    if (
      !["png", "jpeg", "jpg", "heic", "webp", "heif"].includes(fileExtension)
    ) {
      Swal.fire({
        icon: "error",
        title: "Only PNG, JPG, WEBP, HEIF and HEIC image files are allowed!",
        showConfirmButton: true,
      });
      setFile(null);
      setUploading(false);
      return;
    }

    //If file size is above the max file size then throw an error
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({
        icon: "error",
        title: "File Size Must be below 10 MB",
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
      }

      //Need to compress the image if true
      if (resizedFile.size > 200 * 1024) {
        resizedFile = await compressImage(resizedFile);
        if (resizedFile === "error") {
          Swal.fire({
            icon: "error",
            title: "Failed to Upload Image",
            text: "Please use the link on the CheerBot!",
            showConfirmButton: true,
          });
        }
      }

      const randomString = nanoid(8);
      const imageReference = ref(
        storage,
        "images/image" + fileCount + randomString + "." + fileExtension
      ); // Create the reference, include the number or name

      if (token === firebaseToken) {
        //Uploading the image and setting the file count to add one
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
      } else {
        Swal.fire({
          icon: "error",
          title: "Failed to Upload Image",
          text: "Please use the link on the CheerBot!",
          showConfirmButton: true,
        });

        setFile(null);
        setUploading(false);
      }
    } catch (err) {
      // Any error throw an error saying the image failed to upload
      Swal.fire({
        icon: "error",
        title: "Failed to upload image!",
        text: err.message || "An unknown error occurred",
        showConfirmButton: true,
      });

      setFile(null);
      setUploading(false);
    }
  }

  return (
    <div className="App">
      <div className="container">
        <h1>File Uploader</h1>
        <label className="custom-file-upload">
          <input type="file" onChange={handleFileChange} />
          Choose File{" "}
        </label>
        {file
          ? file.name.length > 27
            ? "Selected File: " + file.name.slice(0, 24) + "..."
            : `Selected File: ${file.name}`
          : "No File Selected"}
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
