# ConvexFS

A powerful, globally distributed file storage and serving component for Convex.

## Install

```bash
npm install convex-fs
```

## Links

- [npm package](https://www.npmjs.com/package/convex-fs)
- [GitHub repository](https://github.com/jamwt/convex-fs)
- [Convex Components Directory](https://www.convex.dev/components/convex-fs)

**Author:** jamwt

**Category:** Backend

**Version:** 0.2.1  
**Weekly downloads:** 409

---

> ConvexFS provides globally distributed file storage and serving for Convex applications with built-in CDN capabilities.

## Benefits

- Store and serve files globally with automatic CDN distribution for faster load times
- Integrate file operations directly into Convex mutations and queries without external services
- Handle file uploads, storage, and retrieval with type-safe APIs that match Convex patterns
- Scale file serving automatically without managing infrastructure or CDN configuration

## Use cases

### how to store user uploaded files in Convex

ConvexFS allows you to handle file uploads directly in your Convex mutations, storing them in globally distributed storage. You can then serve these files through built-in CDN endpoints with automatic optimization.

### file storage solution for Convex backend

ConvexFS integrates natively with Convex to provide file storage without requiring external services like AWS S3. It handles both storage and global serving through its distributed infrastructure.

### serve static assets from Convex application

ConvexFS enables serving static assets and user-generated content directly from your Convex backend. Files are automatically distributed globally and served through optimized CDN endpoints for fast access.

## FAQ

**Q: How does ConvexFS integrate with Convex mutations and queries?**

ConvexFS provides APIs that work directly within Convex mutations and queries, allowing you to store files as part of your database transactions. You can upload files in mutations and reference them in queries using the same patterns as other Convex operations.

**Q: Does ConvexFS require external service configuration?**


Yes. ConvexFS uses bunny.net for blob storage and CDN delivery. You'll need to create a bunny.net account, set up a storage zone and pull zone, and configure four environment variables (storage zone name, CDN hostname, token key, and API key). 

**Q: What file types and sizes does ConvexFS support?**

ConvexFS supports standard web file types, including images, documents, and media files. The specific size limits and supported formats depend on the component's current implementation details.

**Q: How does ConvexFS pricing work compared to external storage services?**

ConvexFS itself is a free open-source component, but bunny.net storage and CDN costs are separate. bunny.net offers a trial period and affordable pay-as-you-go pricing. Your Convex usage (database, functions) is billed normally through Convex.

## Resources

- [npm package](https://www.npmjs.com/package/convex-fs)
- [GitHub repository](https://github.com/jamwt/convex-fs)
- [Convex Components Directory](https://www.convex.dev/components/convex-fs)
- [Convex documentation](https://docs.convex.dev)

---

[ConvexFS](https://convexfs.dev/) is a Convex component that provides filesystem-like operations for managing files in your Convex application. Instead of dealing with raw blob storage, you work with familiar concepts like paths, files, and directories—while getting the performance benefits of a global CDN.

Features
Path-based file management — Organize files with familiar filesystem paths
Atomic transactions — Move, copy, and delete files with preconditions to prevent data races
Reference-counted blobs — Efficient storage with automatic deduplication
Signed CDN URLs — Secure, time-limited download links served from Bunny.net's global edge network
Soft deletes & disaster recovery — Configurable grace periods let you recover from accidental deletions
Flexible authentication — Bring your own auth logic for uploads and downloads
File expiration — Set automatic expiration times on files for temporary uploads, time-limited sharing, or session-scoped content
Custom CDN parameters — Pass parameters to Bunny.net edge rules for on-the-fly transformations like custom download filenames and image optimization

Documentation
For installation instructions, guides, and API reference, visit:

[ConvexFS](https://convexfs.dev/)



---

[![Convex Component](https://www.convex.dev/components/badge/convex-fs)](https://www.convex.dev/components/convex-fs)