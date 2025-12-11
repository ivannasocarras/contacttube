<?php
ini_set('display_errors', 1);

$inData = getRequestInfo();

$userId = $inData["userId"];
$firstName = $inData["firstName"];
$lastName = $inData["lastName"];
$phone = $inData["phone"];
$email = $inData["email"];

$conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "ContactTube");
if( $conn->connect_error )
{
	returnWithError( $conn->connect_error );
}
else
{
	// Insert new contact with current date
	$stmt = $conn->prepare("INSERT INTO Contacts (UserID, firstName, lastName, phone, email, date) VALUES (?, ?, ?, ?, ?, NOW())");
	$stmt->bind_param("issss", $userId, $firstName, $lastName, $phone, $email);
	
	if( $stmt->execute() )
	{
		$newContactId = $conn->insert_id;
		returnWithInfo( $newContactId );
	}
	else
	{
		returnWithError("Failed to add contact");
	}

	$stmt->close();
	$conn->close();
}

function getRequestInfo()
{
	return json_decode(file_get_contents('php://input'), true);
}

function sendResultInfoAsJson( $obj )
{
	header('Content-type: application/json');
	echo $obj;
}

function returnWithError( $err )
{
	$retValue = '{"id":0,"error":"' . $err . '"}';
	sendResultInfoAsJson( $retValue );
}

function returnWithInfo( $id )
{
	$retValue = '{"id":' . $id . ',"error":""}';
	sendResultInfoAsJson( $retValue );
}

?>
