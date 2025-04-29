# Cricket Live Dashboard

A responsive web application that displays live cricket scores, match details, and allows users to create accounts and save their favorite matches.

## Features

- Live cricket scores and match updates
- Detailed match information including scorecard and player details
- User authentication (login/signup)
- Contact form for user feedback
- Responsive design for all devices
- Animated UI elements for better user experience

## Setup Instructions

### Prerequisites

- PHP 7.4 or higher
- MySQL database
- Web server (Apache, Nginx, etc.)

### Database Setup

1. Create a MySQL database named `cricket_dashboard`
2. Import the database schema from `backend/database.sql`

```sql
mysql -u username -p cricket_dashboard < backend/database.sql
```

### Configuration

1. Update the database connection details in `backend/auth.php` if needed:

```php
$host = 'localhost';
$dbname = 'cricket_dashboard';
$username = 'root'; // Change to your MySQL username
$password = ''; // Change to your MySQL password
```

### Running the Application

1. Place the project files in your web server's document root
2. Access the application through your web browser: `http://localhost/cricket-dashboard`

## API Usage

This application uses the Cricket API from cricapi.com. The current API key is included in the code, but you may need to register for your own API key if it expires.

1. Register at [cricapi.com](https://cricapi.com)
2. Get your API key
3. Update the API key in `script.js`:

```javascript
const API_KEY = 'your-api-key-here';
```

## Pages

- **Home**: View all cricket matches with filtering options
- **Login**: User authentication
- **Signup**: New user registration
- **Contact**: Send messages to administrators

## Technologies Used

- HTML5, CSS3, JavaScript
- TailwindCSS for styling
- PHP for backend processing
- MySQL for data storage
- Font Awesome for icons

## License

This project is licensed under the MIT License.