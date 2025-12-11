<?php
ini_set('display_errors', 0);
error_reporting(0);

$inData = getRequestInfo();

$id = $inData["id"];
$userId = $inData["userId"];

$conn = new mysqli("localhost", "TheBeast", "WeLoveCOP4331", "ContactTube");
if( $conn->connect_error )
{
        returnWithError( $conn->connect_error );
}
else
{
        // Delete contact (with userId check for security)
        $stmt = $conn->prepare("DELETE FROM Contacts WHERE ID=? AND userId=?");
        $stmt->bind_param("ii", $id, $userId);

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
                returnWithError("Failed to delete contact");
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
