<?php
ini_set('display_errors', 1);

$inData = getRequestInfo();

$id = $inData["id"];
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
	// Update contact (with userId check for security)
	$stmt = $conn->prepare("UPDATE Contacts SET firstName=?, lastName=?, phone=?, email=? WHERE ID=? AND UserID=?");
	$stmt->bind_param("ssssii", $firstName, $lastName, $phone, $email, $id, $userId);
	
	if( $stmt->execute() )
	{
		if( $stmt->affected_rows > 0 )
		{
			returnWithSuccess();
		}
		else
		{
			returnWithError("Contact not found or access denied");
		}
	}
	else
	{
		returnWithError("Failed to update contact");
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

function returnWithSuccess()
{
	$retValue = '{"id":0,"error":""}';
	sendResultInfoAsJson( $retValue );
}

?>
