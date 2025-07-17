import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { config } from "../config";

const dynamoDbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
});

export const getAllPortfolios = async () => {
  let lastEvaluatedKey: any = undefined;
  const portfolios: any[] = [];

  do {
    const { Items, LastEvaluatedKey } = await dynamoDbClient.send(
      new ScanCommand({
        TableName: `PortfolioDb${config.env}`,
        FilterExpression: "#type = :type",
        ExpressionAttributeNames: {
          "#type": "type",
        },
        ExpressionAttributeValues: {
          ":type": "CUSTOMER_PORTFOLIO",
        },
        ExclusiveStartKey: lastEvaluatedKey,
      })
    );

    if (!Items?.length) {
      return [];
    }

    lastEvaluatedKey = LastEvaluatedKey;
    portfolios.push(...Items);
  } while (lastEvaluatedKey);

  return portfolios;
};
