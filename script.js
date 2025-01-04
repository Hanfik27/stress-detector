// Mengecek apakah browser mendukung akses kamera
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    console.log("Webcam supported!");

    // Mengakses webcam
    const video = document.getElementById("video");
    const statusElement = document.getElementById("status");
    const detectedExpression = document.getElementById("detected-expression");

    // Mengambil video dari webcam
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then((stream) => {
            video.srcObject = stream;
        })
        .catch((err) => {
            console.error("Error accessing webcam: ", err);
            statusElement.innerHTML = "Unable to access camera.";
        });

    // Menggunakan face-api.js untuk mendeteksi ekspresi wajah
    async function setupFaceAPI() {
        await faceapi.nets.ssdMobilenetv1.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceExpressionNet.loadFromUri('/models');
        statusElement.innerHTML = "Model Loaded!";

        // Mendeteksi wajah dan ekspresi setiap frame video
        video.addEventListener('play', () => {
            setInterval(async () => {
                if (video.paused || video.ended) return;

                // Mengambil deteksi wajah dari video
                const detections = await faceapi.detectAllFaces(video)
                    .withFaceLandmarks()
                    .withFaceExpressions();

                // Menampilkan hasil deteksi ekspresi
                if (detections.length > 0) {
                    const expressions = detections[0].expressions;
                    let dominantExpression = Object.keys(expressions).reduce((a, b) =>
                        expressions[a] > expressions[b] ? a : b
                    );
                    detectedExpression.innerHTML = `Stress Level: ${dominantExpression.toUpperCase()}`;
                }
            }, 100);
        });
    }

    // Memastikan model face-api.js sudah dimuat
    setupFaceAPI();
} else {
    alert("Webcam not supported in this browser.");
}
