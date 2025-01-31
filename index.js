const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors")
const morgan = require('morgan')
const nodemailer = require('nodemailer');

const app = express();

app.use(
  cors({
    origin: ["https://blog-app-one-beige.vercel.app/", "https://blog-app-one-beige.vercel.app/"],
    credentials: true,
  })
);
app.use(express.json());
app.use(morgan('dev'));

mongoose
  .connect("mongodb+srv://madhavan:RMVeGsYUWABB6pUK@cluster0.a0ssi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB:", err));

// Simplified Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'madhavan8610331381@gmail.com',
        pass: 'fdti aoqf ofnc ivov'
    }
});

// User Schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});
const User = mongoose.model("User", UserSchema);

// Post Schema
const PostSchema = new mongoose.Schema({
  username: { type: String, required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
});
const Post = mongoose.model("Post", PostSchema);

// Blog Schema
const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  externalLink: { type: String, required: false },
  createdAt: { type: Date, default: Date.now },
});
const Blog = mongoose.model("Blog", BlogSchema);

// Register Route
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: "Username and password are required" });
  }
  try {
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ status: 'error', message: "Username already exists" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
    res.status(200).json({ status: 'success', message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ status: 'error', message: "Internal server error" });
  }
});

// Login Route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ status: 'error', message: "User not found" });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ status: 'error', message: "Invalid password" });
    }
    res.status(200).json({ 
      status: 'success', 
      data: { 
        id: user._id, 
        username: user.username 
      } 
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ status: 'error', message: "Login failed" });
  }
});

// Create a Post
app.post('/post', async (req, res) => {
  console.log("=== POST CREATION ATTEMPT ===");
  console.log("Full Request Body:", req.body);
  console.log("Request Headers:", req.headers);

  const { username, title, content } = req.body;

  // Validate inputs
  if (!username) {
    console.error("ERROR: No username provided");
    return res.status(400).json({ message: 'Username is required' });
  }

  if (!title) {
    console.error("ERROR: No title provided");
    return res.status(400).json({ message: 'Title is required' });
  }

  if (!content) {
    console.error("ERROR: No content provided");
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    console.log(`Checking for user: ${username}`);
    
    // Find user
    const user = await User.findOne({ username });

    if (!user) {
      console.error(`ERROR: User not found - ${username}`);
      return res.status(404).json({ message: 'User not found' });
    }

    // Create new post
    const newPost = new Post({ 
      username, 
      title: title.trim(), 
      content: content.trim() 
    });

    // Save post with additional error handling
    try {
      const savedPost = await newPost.save();
      console.log("Post saved successfully:", savedPost);
      
      res.status(201).json({ 
        message: 'Post created successfully', 
        post: savedPost 
      });
    } catch (saveError) {
      console.error("SAVE ERROR Details:", {
        name: saveError.name,
        message: saveError.message,
        stack: saveError.stack,
        errors: saveError.errors
      });

      // Check for Mongoose validation errors
      if (saveError.name === 'ValidationError') {
        const validationErrors = Object.values(saveError.errors)
          .map(err => err.message)
          .join(', ');
        
        return res.status(400).json({ 
          message: 'Validation Error', 
          details: validationErrors 
        });
      }

      // Generic save error
      return res.status(500).json({ 
        message: 'Failed to save the post', 
        error: saveError.message 
      });
    }
  } catch (err) {
    console.error("UNEXPECTED ERROR Details:", {
      name: err.name,
      message: err.message,
      stack: err.stack
    });

    res.status(500).json({ 
      message: 'Failed to create the post', 
      error: err.message 
    });
  }
});

// Get User's Posts
app.get("/myposts/:username", async (req, res) => {
  try {
    const username = req.params.username;
    if (!username) {
      return res.status(400).json({ status: 'error', message: "Username is required" });
    }
    
    const posts = await Post.find({ username }).sort({ createdAt: -1 });
    
    if (posts.length > 0) {
      return res.json({ status: 'success', data: posts });
    } else {
      return res.json({ status: 'success', data: [], message: "No posts found for this user" });
    }
  } catch (err) {
    console.error("Error fetching posts:", err);
    res.status(500).json({ status: 'error', message: "Server error while fetching posts" });
  }
});

// Get All Posts
app.get("/allposts", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json({ status: 'success', data: posts });
  } catch (error) {
    res.status(500).json({ status: 'error', message: "Failed to fetch posts" });
  }
});

// Create a Blog
app.post("/blogs/create", async (req, res) => {
  const { title, content, author, category, externalLink } = req.body;
  if (!title || !content || !author || !category) {
    return res.status(400).json({ status: 'error', message: "Please fill all the required fields" });
  }
  try {
    const newBlog = new Blog({ title, content, author, category, externalLink });
    await newBlog.save();
    res.status(201).json({ status: 'success', message: "Blog created successfully", data: newBlog });
  } catch (error) {
    console.error("Error creating blog:", error);
    res.status(500).json({ status: 'error', message: "Error creating blog, please try again" });
  }
});

// Get All Blogs
app.get("/blogs", async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', data: blogs });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    res.status(500).json({ status: 'error', message: "Error fetching blogs" });
  }
});

// Contact Route
app.post("/contact", async (req, res) => {
    const { name, email, phone, message } = req.body;

    // Email validation
    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Validate input
    if (!email || !validateEmail(email)) {
        return res.status(400).json({ 
            status: 'error', 
            message: "Invalid email address provided" 
        });
    }

    // Prepare user email options
    const userMailOptions = {
        from: 'madhavan8610331381@gmail.com',
        to: email,
        subject: 'Contact Form Submission Confirmation',
        text: `
Hello ${name},
   
Thank you for contacting Recipe Management App.

We have received your message:

Name: ${name}
Phone: ${phone}

Your Message:
${message || 'No message provided'}

We will review your submission and respond soon.

Best regards,
Recipe Management Team
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
    <div style="background-color: white; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">Contact Form Confirmation</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Thank you for contacting Recipe Management App.</p>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Message:</strong> ${message || 'No message provided'}</p>
        </div>
        <p>We will review your submission and respond soon.</p>
        <p>Best regards,<br>Recipe Management Team</p>
    </div>
</div>
        `
    };

    // Prepare admin notification email
    const adminMailOptions = {
        from: 'madhavan8610331381@gmail.com',
        to: {email},
        subject: `New Contact Form Submission from ${name}`,
        text: `
New contact form submission received:

Name: ${name}
Email: ${email}
Phone: ${phone}

Message:
${message || 'No message provided'}
        `,
        html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f4f4f4; padding: 20px;">
    <div style="background-color: white; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">New Contact Form Submission</h2>
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Phone:</strong> ${phone}</p>
            <p><strong>Message:</strong> ${message || 'No message provided'}</p>
        </div>
    </div>
</div>
        `
    };

    // Send emails
    try {
        // Send email to user
        transporter.sendMail(userMailOptions, (userError, userInfo) => {
            if (userError) {
                console.error('Error sending user email:', userError);
                
                // Send admin notification about email sending failure
                transporter.sendMail({
                    from: 'madhavan8610331381@gmail.com',
                    to: {email},
                    subject: 'Email Sending Failure Alert',
                    text: `Failed to send contact form confirmation email.

Details:
Name: ${name}
Email: ${email}
Error: ${userError.toString()}
                    `
                });

                return res.status(500).json({ 
                    status: 'error', 
                    message: "Failed to send confirmation email" 
                });
            }

            // Send admin notification
            transporter.sendMail(adminMailOptions, (adminError, adminInfo) => {
                if (adminError) {
                    console.error('Error sending admin email:', adminError);
                }

                // Respond to client regardless of admin email status
                res.status(200).json({ 
                    status: 'success', 
                    message: "Contact form submission successful" 
                });
            });
        });
    } catch (error) {
        console.error('Unexpected error in contact route:', error);
        res.status(500).json({ 
            status: 'error', 
            message: "Unexpected error processing contact form" 
        });
    }
});

// Delete post endpoint
app.delete('/post/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const result = await Post.findByIdAndDelete(postId);
    if (!result) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ success: false, message: 'Failed to delete post' });
  }
});

// Edit post endpoint
app.put('/post/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const { title, content } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title and content are required' 
      });
    }
    
    const updatedPost = await Post.findByIdAndUpdate(
      postId,
      { 
        title, 
        content,
        updatedAt: new Date()
      },
      { new: true }
    );
    
    if (!updatedPost) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    res.json({
      success: true,
      message: 'Post updated successfully',
      post: updatedPost
    });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update post' 
    });
  }
});

// Get all registered users
app.get('/api/all-users', async (req, res) => {
  try {
    console.log('Fetching all registered users');
    
    // Fetch all users, selecting only username and other non-sensitive fields
    const users = await User.find({}, 'username');
    
    console.log('Registered users found:', users.length);
    
    // Map the users to extract usernames
    const usernames = users.map(user => user.username);
    
    res.status(200).json({
      status: 'success',
      count: usernames.length,
      users: usernames
    });
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ 
      status: 'error', 
      message: 'Failed to fetch users',
      error: error.message 
    });
  }
});

app.listen(4000, () => {
  console.log("Server is running on https://blog-app-one-beige.vercel.app/");
});
