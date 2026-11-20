# EcoTrack

A mobile-first waste reporting and collection management system that uses geolocation. Residents report waste with a photo and GPS position, an administrator reviews each report and assigns a collector, and the resident follows it until it is cleared.

**Live app:** https://ecotrack-waste.vercel.app

## Roles

- **Resident:** reports waste, follows each report, schedules a preferred date, cancels or rates a report.
- **Administrator:** reviews, approves or rejects with a reason, assigns collectors, manages users, views analytics and a map.
- **Collector:** sees assigned jobs nearest first, navigates to them, and completes each job with a proof photo taken at the location.

## Report workflow

Received, Approved, Collector assigned, Being attended to, Completed.
A report can also be Rejected by the admin, or Cancelled by the resident before a collector is assigned. The rules are enforced in the database, so they hold even if the app is bypassed.

## Features

- GPS capture with a draggable pin, an accuracy circle and a satellite view
- Photo upload with compression
- Duplicate report warning within 50 m
- 100 m location check before a collection can be completed
- Notifications stored in the database, with a bell and an unread count
- Admin analytics, hotspot heatmap, filters, search and CSV export
- Installable progressive web app

## Stack

React, Vite, Tailwind CSS, Leaflet with OpenStreetMap, Supabase (Auth, PostgreSQL, Storage, Realtime), BigDataCloud reverse geocoding, Vercel hosting.

## Run it locally

    npm install
    npm run dev

Create a `.env` file with:

    VITE_SUPABASE_ANON_KEY=your publishable key
    VITE_BIGDATACLOUD_KEY=your BigDataCloud key

The Supabase project URL is set in `src/supabaseClient.js`. Build the database with the scripts in `supabase/`.

## Known limitations

- The 100 m location check runs in the app, not on the server.
- Photos are stored in a public bucket.
- Notifications appear only while the app is open. There are no push notifications.
- Phone numbers are checked for format and are not verified.
- The free Supabase plan pauses a project after a week of inactivity and has no automatic backups.
