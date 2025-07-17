import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";

const dynamoDbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const getAllTransactions = async (customerId: string) => {
  let lastEvaluatedKey: any = undefined;
  const transactions: any[] = [];

  do {
    const { Items, LastEvaluatedKey } = await dynamoDbClient.send(
      new QueryCommand({
        TableName: `TransactionsDb${config.env}`,
        KeyConditionExpression: "#customerId = :customerId",
        ExpressionAttributeNames: {
          "#customerId": "customerId",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":customerId": customerId,
          ":status": "COMPLETED",
        },
        FilterExpression: "#status = :status",
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (!Items?.length) {
      return [];
    }

    lastEvaluatedKey = LastEvaluatedKey;
    transactions.push(...Items);
  } while (lastEvaluatedKey);

  return transactions;
};
