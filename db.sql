create database cuet_bus_management;

use cuet_bus_management;
-- 1. User Table
CREATE TABLE User (
    user_id INT PRIMARY KEY,
    email VARCHAR(100) NOT NULL,
    name VARCHAR(100),
    password VARCHAR(100) NOT NULL,
    gender VARCHAR(10),
    phone_number VARCHAR(20),
    role VARCHAR(50)
);

-- 2. Bus Table
CREATE TABLE Bus (
    bus_id INT PRIMARY KEY auto_increment,
    bus_name VARCHAR(100),
    bus_number VARCHAR(50),
    bus_type VARCHAR(50)
);

-- 3. Seat Table (Weak Entity)
CREATE TABLE Seat (
    r_number varchar(5),
    column_number INT,
    bus_id INT,
    status VARCHAR(20),
    PRIMARY KEY (r_number, column_number, bus_id),
    FOREIGN KEY (bus_id) REFERENCES Bus(bus_id)
);

-- 4. Staff Table
CREATE TABLE Staff (
    staff_id INT PRIMARY KEY auto_increment,
    name VARCHAR(100),
    staff_role VARCHAR(50),
    location_link VARCHAR(255),
    phone_number varchar(15)
);

-- 5. Route Table
CREATE TABLE Route (
    route_id INT PRIMARY KEY auto_increment,
    source VARCHAR(100),
    destination VARCHAR(100),
    via varchar(250) 
);

-- 6. Schedule Table
CREATE TABLE Schedule (
    schedule_id INT PRIMARY KEY auto_increment,
    time TIME NOT NULL,
    date DATE NOT NULL,
    route_id INT,
    bus_id INT,
    driver_id INT, 
    helper_id INT,
    FOREIGN KEY (route_id) REFERENCES Route(route_id),
    FOREIGN KEY (bus_id) REFERENCES Bus(bus_id),
    FOREIGN KEY (driver_id) REFERENCES Staff(staff_id),
    FOREIGN KEY (helper_id) REFERENCES Staff(staff_id)
);

-- 7. Booking Table
CREATE TABLE Booking (
    booking_id INT PRIMARY KEY auto_increment,
    booking_time TIMESTAMP NOT NULL,
    user_id INT,
    schedule_id INT,
    r_number varchar(5),
    column_number INT,
    bus_id INT,
    FOREIGN KEY (user_id) REFERENCES User(user_id),
    FOREIGN KEY (schedule_id) REFERENCES Schedule(schedule_id),
    foreign key(r_number,column_number,bus_id) references Seat(r_number,column_number,bus_id)
);

