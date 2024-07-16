import React, { useState, useEffect } from "react";
import { storage } from "./firebase";
import {
  ref,
  uploadBytes,
  listAll,
  getDownloadURL,
  list,
} from "firebase/storage";

//Need to add some sort of authentication to this as now anyone can change

function App() {
  const [file, setFile] = useState(null); //Stores the image files
  const [images, setImages] = useState([]); //Stores a list of Images, Probably wont need this
  const [fileCount, setFileCount] = useState(0); //Stores the number of Images
  const [uploading, setUploading] = useState(false);

  const imagesListRef = ref(storage, "images/");

  useEffect(() => {
    listAll(imagesListRef).then((response) => {
      response.items.forEach((item) => {
        getDownloadURL(item).then((url) => {
          setImages((prev) => [...prev, url]);
          const itemCount = response.items.length;
          setFileCount(itemCount);
          console.log(itemCount);
        });
      });
    });
  }, []);

  function handleUpload() {
    setUploading(true);
    if (file == null) {
      alert("No Image File Selected");
      setUploading(false);
      return;
    }
    const fileType = file.type;
    if (!["image/png", "image/jpeg"].includes(fileType)) {
      alert("Only image PNG or JPG Files are allowed!");
      setUploading(false);
      return;
    }

    const fileExtension = fileType === "image/png" ? ".png" : ".jpg";
    const imageReference = ref(
      storage,
      "images/image" + fileCount + fileExtension
    );

    uploadBytes(imageReference, file).then((snapshot) => {
      getDownloadURL(snapshot.ref).then((url) => {
        setImages((prev) => [...prev, url]);
        setFileCount((prevCount) => prevCount + 1);
      });
    });
    alert("Image has been Uploaded!");
    setUploading(false);
  }

  function handleFileChange(event) {
    setFile(event.target.files[0]);
  }

  return (
    <div className="App">
      <input type="file" onChange={handleFileChange} />
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
