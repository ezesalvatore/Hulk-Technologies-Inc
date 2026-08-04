# HulkTechnology

## Presentation

https://docs.google.com/presentation/d/1ZOjZthx3FyImqRbBLr8MHzgPgBOlXjn7mhxd4WQM-Mg/edit?usp=sharing

## Network Architecture

Frontend: Github -> Amplify + Cognito

Backend: DynamoDB + S3 -> Lambda -> API Gateway 

Delivery System: SES confirmation of work 

<img width="808" height="413" alt="image" src="https://github.com/user-attachments/assets/af1311d0-859d-48a5-aa00-c3c7e7091c4d" />

## Dynamo Database Schema

We use two tables: `EquipmentTable` to store all rental inventory across five categories, and `ReservationTable` to record every booking with status and timestamp.

### EquipmentTable

| Field       | Type   | Notes                                                        |
|-------------|--------|---------------------------------------------------------------|
| equipmentId | S (PK) | e.g. `EQ#mbp16-001`                                            |
| name        | S      | "MacBook Pro 16""                                              |
| category    | S      | laptops, desktops, monitors, network switches, AV equipment   |
| available   | BOOL   | true / false                                                   |
| stock       | N      | units in inventory                                             |
| costPerDay  | N      | rental cost per day                                            |
| spec        | S      | short spec summary                                             |
| description | S      | listing description                                            |
| imageKey    | S      | S3 object key, e.g. `equipment/laptops/mbp16-001.jpg`          |

**GSI - CategoryIndex:** PK `category`, SK `name`

### ReservationTable

| Field         | Type   | Notes                                        |
|---------------|--------|------------------------------------------------|
| reservationId | S (PK) | e.g. `RES#7f3a9c`                              |
| equipmentId   | S      | FK to EquipmentTable                           |
| userId        | N      | FK to Customers                                |
| quantity      | N      | units reserved                                 |
| startDate     | S      | ISO date                                       |
| endDate       | S      | ISO date                                       |
| status        | S      | pending / confirmed / cancelled / completed    |
| totalCost     | N      | total rental cost                              |
| createdAt     | S      | ISO timestamp                                  |

**GSI 1 - EquipmentIndex:** PK `equipmentId`, SK `startDate`
**GSI 2 - UserIndex:** PK `userId`, SK `startDate`

> `imageKey` points to an object in S3 rather than a public URL, so image access can be served through signed URLs.
