import React, { useState, useEffect } from "react";
import "./App.css";
import { storage } from "./firebase";
import {
  ref,
  uploadBytes,
  listAll,
  getDownloadURL,
  list,
} from "firebase/storage";
import heic2any from "heic2any";
import { nanoid } from "nanoid";
import Swal from "sweetalert2";
import Resizer from "react-image-file-resizer";

//Need to add some sort of authentication to this as now anyone can change
//Need to add a way to reduce resolution

function App() {
  const [file, setFile] = useState(null); //Stores the image files
  //const [images, setImages] = useState([]); //Stores a list of Images, Probably wont need this
  const [fileCount, setFileCount] = useState(0); //Stores the number of Images
  const [uploading, setUploading] = useState(false);

  const imagesListRef = ref(storage, "images/"); //The file on firebase starts in the images folder

  useEffect(() => {
    listAll(imagesListRef).then((response) => {
      setFileCount(response.items.length); //Get the initial number of files
      console.log(response.items.length);
    });
  }, []);

  const resizeFile = (file) => {
    return new Promise((resolve) => {
      Resizer.imageFileResizer(
        file,
        1920, // maxWidth
        1920, // maxHeight
        "JPEG",
        90, // quality
        0,
        (uri) => {
          resolve(uri);
        },
        "blob" // outputType
      );
    });
  };

  async function handleUpload() {
    setUploading(true);

    if (file == null) {
      Swal.fire({
        icon: "error",
        title: "No image selected!",
        showConfirmButton: true,
      }); //No file selected
      setUploading(false);
      return;
    }
    const fileExtension = file.name.split(".").pop().toLowerCase();

    console.log(fileExtension);

    if (!["png", "jpeg", "heic", "webp", "heif"].includes(fileExtension)) {
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
    let holderFile = file;

    try {
      if (fileExtension === "heic") {
        console.log("hello");
        const heicFile = await heic2any({
          blob: holderFile,
          toType: "image/png",
        });
        fileToProcess = heicFile;
      }

      const resizedFile = await resizeFile(fileToProcess);

      console.log("Flag2");
      const randomString = nanoid(8);
      console.log(nanoid);
      const imageReference = ref(
        storage,
        "images/image" + fileCount + randomString + "." + fileExtension
      ); //Create the reference, include the number or name

      console.log(
        "images/image" + fileCount + randomString + "." + fileExtension
      );

      console.log("Flag3");
      await uploadBytes(imageReference, resizedFile).then((snapshot) => {
        getDownloadURL(snapshot.ref).then((url) => {
          setFileCount((prevCount) => prevCount + 1);
        });
      });

      console.log("Flag4");
      //Fire an alert
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
          {" "}
          Upload Image
        </button>
      </div>
      {/* images.map((url, index) => {
        return (
          <div key={index}>
            <br />
            <img src={url} />
          </div>
        );
      }) Don't Need To Represent Images  */}
    </div>
  );
}

export default App;
