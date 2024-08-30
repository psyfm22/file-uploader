import React, { useState, useEffect } from "react";
import "./App.css";
import Lottie from "lottie-react";
import { storage, authentication, signInAnonymously } from "./firebase";
import { ref, uploadBytes, listAll, getDownloadURL } from "firebase/storage";
import heic2any from "heic2any";
import { nanoid } from "nanoid";
import Swal from "sweetalert2";
import Resizer from "react-image-file-resizer";
import uploadingAnimation from "./animation/uploadingAnimation.json";

function App() {
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
  const [file, setFile] = useState(null); // Stores the image files
  const [fileCount, setFileCount] = useState(0); // Stores the number of Images
  const [uploading, setUploading] = useState(false);
  const [token, setToken] = useState("");

  const imagesListRef = ref(storage, "images/"); //The file on firebase starts in the images folder

  //Signs the user annonymously into the firebase
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
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get("token");
    setToken(token);
    // sign in the user first to the user
    const authenticateAndFetchImages = async () => {
      if (!authentication.currentUser) {
        await signInAnonymouslyHandler();
      }
    };
    authenticateAndFetchImages();
  }, [authentication.currentUser, imagesListRef]);

  //resize the image using Resizer to these set proportions
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

    // const token = await getToken(appCheck);
    // console.log(token);

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

    //Lets retrieve the code here
    console.log(token);

    let firebaseToken;

    const fileRef = ref(storage, "code/dailycode");
    getDownloadURL(fileRef).then(async (url) => {
      console.log(url);
      fetch(url)
        .then((response) => response.arrayBuffer()) // Fetch the file as an array buffer
        .then((buffer) => {
          const byteArray = new Uint8Array(buffer); // Convert the buffer to a byte array
          console.log(byteArray);
          firebaseToken = String.fromCharCode(...byteArray);
        })
        .catch((error) => {
          console.error("Error fetching byte array:", error);
        });
    });
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

      //Uploading the image and setting the file count to add one
      await uploadBytes(imageReference, fileToProcess).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((url) => {
          setFileCount((prevCount) => prevCount + 1);
        });
      });

      // Fire an alert
      Swal.fire({
        icon: "success",
        title:
          "Your Image has been Uploaded! here is token from header " +
          token +
          " and firebase Token " +
          firebaseToken,
        showConfirmButton: true,
      });

      setFile(null);
      setUploading(false);
    } catch (err) {
      // Any error throw an error saying the image failed to upload
      console.error("Error during upload process:", err);
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

  //Set the file to the selected file change
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
