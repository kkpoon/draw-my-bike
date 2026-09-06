# Draw My Bike

An interactive, dependency-free web app that draws a scaled 2D drive-side bicycle from frame and component geometry.

## Features

- Live SVG drawing of the frame, wheels, fork, cockpit and drivetrain
- Inputs for wheel, chassis, frame and contact-point dimensions
- Calculated reach, stack, front centre, trail and top-tube length
- Geometry validation with clear invalid-state feedback
- Responsive layout for desktop and mobile

## Run locally

Serve the `dist` directory with any static web server, then open its root URL.

## Geometry model

Angles are measured from the ground. Bottom-bracket position is derived from chainstay length and BB drop. The head tube is placed directly from the entered reach and stack; the fork then connects its lower point to the front axle. Calculated values are rounded to the nearest millimetre for display.
