require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const { Server } = require("socket.io");

const app = express();
app.use(cors({ origin: "*", methods: ["POST", "GET"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const storage = multer.memoryStorage();
const upload = multer({
	storage,
});

cloudinary.config({
	api_key: process.env.CLOUDINARY_API_KEY,
	api_secret: process.env.CLOUDINARY_API_SECRET,
	cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
});

app.get("/", (req, res) => {
	res.send(
		"<h1>This is a Socket server used to handle web socket functions and cloudinary functions</h1>"
	);
});
app.post("/upload-to-cloudinary", upload.single("image"), async (req, res) => {
	if (!req.file) {
		return res
			.status(400)
			.json({ success: false, message: "No file uploaded" });
	}
	try {
		await cloudinary.uploader
			.upload_stream({}, (error, result) => {
				if (error) {
					return res
						.status(error.http_code)
						.json({ success: false, message: error.message });
				}
				res.status(200).json({
					sucess: true,
					message: "Image uploaded successfully",
					image_url: result.secure_url,
					public_id: result.public_id,
				});
			})
			.end(req.file.buffer);
	} catch (error) {
		return res.status(400).json({ success: false, message: error.message });
	}
});

app.post("/delete-from-cloudinary", async (req, res) => {
	const { public_id } = req.body;
	if (!public_id) {
		return res
			.status(404)
			.json({ success: false, message: "Public Id is not given" });
	}
	try {
		await cloudinary.uploader.destroy(public_id);
		res.status(200).json({ success: true, message: "Image deleted" });
	} catch (error) {
		res.status(400).json({ success: false, message: error.message });
	}
});

//Socket
const server = http.createServer(app);
const io = new Server(server, {
	cors: {
		origin: "*",
		methods: ["GET", "POST"],
	},
});
io.on("connection", (socket) => {
	console.log("A user connected:", socket.id);
	socket.on("sendTypingSignal", (data) => {
		io.emit("receiveTypingSignal", data);
	});

	socket.on("sendMessage", (data) => {
		io.emit("receiveMessage", data);
	});

	socket.on("sendNotification", (data) => {
		console.log("Received Notification", data);
		io.emit("receiveNotification", data);
	});

	socket.on("disconnect", () => {
		console.log("User disconnected:", socket.id);
	});
});

server.listen(process.env.PORT, () =>
	console.log(`Socket.io Server running on port ${process.env.PORT}`)
);
