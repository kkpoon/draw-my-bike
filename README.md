# Draw My Bike

An interactive, dependency-free web app that draws a scaled 2D drive-side bicycle from frame and component geometry.

## Features

- Live SVG drawing of the frame, wheels, fork, cockpit and drivetrain
- Inputs for wheel, chassis, frame and contact-point dimensions, including cockpit spacer height
- Optional scaled rider with editable height, inseam, torso and arm measurements
- Calculated reach, stack, front centre, trail and top-tube length
- Geometry validation with clear invalid-state feedback
- Responsive layout for desktop and mobile

The default preset is the Canyon Endurace CF 8 Di2, model year 2027, size XS. Frame and stock component values follow Canyon's published UK geometry table; the displayed 686 mm wheel diameter represents a 622 mm rim with the stock 32 mm tyres.

## Run locally

Serve the `dist` directory with any static web server, then open its root URL.

## Geometry model

Angles are measured from the ground. Bottom-bracket position is derived from chainstay length and BB drop. The head tube is placed directly from the entered reach and stack; the fork then connects its lower point to the front axle. Calculated values are rounded to the nearest millimetre for display.
