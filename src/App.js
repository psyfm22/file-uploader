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
  const [firebaseToken, setFirebaseToken] = useState("");

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

  //Character limit lets set it to 27, but if over this then, 28 we show first 24 characters and three dots

  useEffect(() => {
    const authenticateUser = async () => {
      try {
        const queryParams = new URLSearchParams(window.location.search);
        const token = queryParams.get("token");
        setToken(token);
        setToken("E1Hsvc3k");

        // sign in the user first to the user
        if (!authentication.currentUser) {
          await signInAnonymouslyHandler();
        }

        const fileRef = ref(storage, "code/dailycode");

        const url = await getDownloadURL(fileRef);
        console.log(url);

        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const byteArray = new Uint8Array(buffer);
        setFirebaseToken(String.fromCharCode(...byteArray));
      } catch (error) {
        console.error("Error during fetch or authentication:", error);
      }
    };
    authenticateUser();
  }, []);

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

        resizedFile = await resizeFile(fileToProcess);
      }

      const randomString = nanoid(8);
      const imageReference = ref(
        storage,
        "images/image" + fileCount + randomString + "." + fileExtension
      ); // Create the reference, include the number or name

      if (token === firebaseToken) {
        //Uploading the image and setting the file count to add one
        await uploadBytes(imageReference, fileToProcess).then((snapshot) => {
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
