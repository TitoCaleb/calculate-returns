import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { config } from "../config";
import { fromIni } from "@aws-sdk/credential-providers";

const dynamoDbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    // credentials: fromIni({ profile: "blum" }),
  }),
  {
    marshallOptions: {
      removeUndefinedValues: true,
    },
  }
);

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

export const updatePortfolio = async (portfolio: any) => {
  await dynamoDbClient.send(
    new UpdateCommand({
      TableName: `PortfolioDb${config.env}`,
      Key: { customerId: portfolio.customerId, id: portfolio.id },
      UpdateExpression: "set #funds = :funds",
      ExpressionAttributeNames: { "#funds": "funds" },
      ExpressionAttributeValues: { ":funds": portfolio.funds },
    })
  );
};
