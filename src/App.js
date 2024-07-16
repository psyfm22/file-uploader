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
import Swal from "sweetalert2";

//Need to add some sort of authentication to this as now anyone can change

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

  function handleUpload() {
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

    const fileType = file.type; //Get the type of the file

    if (!["image/png", "image/jpeg"].includes(fileType)) {
      //File must be an image of one of these types
      Swal.fire({
        icon: "error",
        title: "Only PNG and JPG image files are allowed!",
        showConfirmButton: true,
      }); //Incorrect File type selected
      setFile(null);
      setUploading(false);
      return;
    }

    const fileExtension = fileType === "image/png" ? ".png" : ".jpg"; //Get The extension
    const imageReference = ref(
      storage,
      "images/image" + fileCount + fileExtension
    ); //Create the reference, include the number or name

    uploadBytes(imageReference, file).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        setFileCount((prevCount) => prevCount + 1);
      });
    });
    //Fire an alert
    Swal.fire({
      icon: "success",
      title: "Your Image has been Uploaded!",
      showConfirmButton: true,
    });
    setFile(null);
    setUploading(false);
  }

  function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  return (
    <div className="App">
      <h1>File Uploader</h1>
      <label className="custom-file-upload">
        <input type="file" onChange={handleFileChange} />
        Upload Image
      </label>
      {file ? `Selected File: ${file.name}` : "Choose File"}
      <br />
      <br />
      <button onClick={handleUpload} disabled={uploading}>
        {" "}
        Upload Image
      </button>
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
