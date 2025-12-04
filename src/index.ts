import {
  getAllPortfolios,
  updatePortfolio,
} from "./repository/PortfoliosRepository";
import { getAllTransactions } from "./repository/TransactionRepository";
import { DONE, ERR, INFO, WARN } from "./utils/customLogs";

const main = async () => {
  const portfolios = await getAllPortfolios();

  console.log(INFO, `Found ${portfolios.length} portfolios`);

  const portfoliosWithFunds = portfolios.filter((portfolio) => {
    const { funds } = portfolio;

    // Verificar que funds existe y es un array
    if (!funds || !Array.isArray(funds)) {
      return false;
    }

    // Filtrar portfolios que tengan al menos uno de los fondos globalCash o globalCashPEN
    const hasTargetFund = funds.some(
      (fund: any) => fund?.id === "globalCash" || fund?.id === "globalCashPEN"
    );

    return hasTargetFund;
  });

  console.log(
    INFO,
    `Found ${portfoliosWithFunds.length} portfolios with funds`
  );

  let count = 0;

  await Promise.all(
    portfoliosWithFunds.map(async (currentPortfolio) => {
      // portfolio funds
      const allTransactions = (
        await getAllTransactions(currentPortfolio.customerId)
      ).filter(({ type, subType }) => {
        if (type === "SELL" && subType === "PARTIAL") {
          return false;
        }

        return true;
      });

      let needUpdatePortfolio = false;
      const newPortfoliosFunds = await Promise.all(
        currentPortfolio.funds.map(async (portfolioFund: any) => {
          // Si el fondo no es globalCash o globalCashPEN, devolverlo sin procesar
          if (
            portfolioFund?.id !== "globalCash" &&
            portfolioFund?.id !== "globalCashPEN"
          ) {
            return portfolioFund;
          }

          // Si el fondo tiene SERIES_A, omitirlo ya que es una serie nueva
          /* if (portfolioFund?.series === "SERIES_A") {
            console.log(
              INFO,
              `Skipping fund ${portfolioFund?.id} with SERIES_A (new series)`
            );
            return portfolioFund;
          } */

          // SERIES_O === NO_SERIES - considerar equivalencia para transacciones antiguas
          const fundTransactions = allTransactions.filter(({ fund }) => {
            if (!fund) return false;

            if (fund?.id !== portfolioFund?.id) return false;

            // Si el portfolio tiene NO_SERIES, buscar tanto NO_SERIES como SERIES_O
            if (portfolioFund?.series === "NO_SERIES") {
              return (
                fund?.series === "NO_SERIES" || fund?.series === "SERIES_O"
              );
            }

            // Si el portfolio tiene SERIES_O, buscar tanto SERIES_O como NO_SERIES
            if (portfolioFund?.series === "SERIES_O") {
              return (
                fund?.series === "SERIES_O" || fund?.series === "NO_SERIES"
              );
            }

            // Para otras series, buscar exactamente la misma
            return fund?.series === portfolioFund?.series;
          });

          console.log(
            INFO,
            `Found ${fundTransactions.length} transactions with fund ${portfolioFund?.id} and series ${portfolioFund?.series}`
          );

          // ordenar transacciones por fecha desde la mas antigua a la mas reciente
          fundTransactions.sort((a, b) => a.creationDate - b.creationDate);

          // console.log({ fundTransactions: JSON.stringify(fundTransactions) });

          const transactionForCreationDate = fundTransactions.reduce(
            (acc, currentTransaction, index, arrayOriginal) => {
              if (
                currentTransaction?.type === "BUY" &&
                arrayOriginal[index - 1]?.type === "SELL" &&
                arrayOriginal[index - 1]?.subType === "TOTAL"
              ) {
                return currentTransaction;
              }

              return acc;
            },
            fundTransactions[0]
          );

          console.log({
            t: JSON.stringify(transactionForCreationDate),
          });

          if (!transactionForCreationDate?.priceDate) {
            console.log(
              ERR,
              `No priceDate found for fund ${portfolioFund?.id} and series ${portfolioFund?.series}`
            );
            return portfolioFund;
          }

          const correctCreationDate = transactionForCreationDate.priceDate;
          const currentCreationDate = portfolioFund?.creationDate;

          console.log(
            INFO,
            `Found correct creationDate ${new Date(
              correctCreationDate
            ).toISOString()} for fund ${portfolioFund?.id} and series ${
              portfolioFund?.series
            }`
          );

          if (currentCreationDate) {
            console.log(
              INFO,
              `Current creationDate: ${currentCreationDate}, Correct creationDate: ${correctCreationDate}}`
            );
          }

          // Solo actualizar si no tiene creationDate o si la fecha correcta es diferente
          if (
            !currentCreationDate ||
            currentCreationDate !== correctCreationDate
          ) {
            needUpdatePortfolio = true;
            console.log(
              INFO,
              `Updating creationDate for fund ${portfolioFund?.id} from ${
                currentCreationDate ? currentCreationDate : "none"
              } to ${correctCreationDate}`
            );
            return {
              ...portfolioFund,
              creationDate: correctCreationDate,
            };
          } else {
            console.log(
              INFO,
              `Fund ${portfolioFund?.id} already has correct creationDate: ${currentCreationDate}`
            );
            return portfolioFund;
          }
        })
      );

      const newPortfolio = {
        ...currentPortfolio,
        funds: newPortfoliosFunds,
      };

      if (needUpdatePortfolio) {
        // await updatePortfolio(newPortfolio);
        count++;
        console.log(DONE, `Updated portfolio ${currentPortfolio?.id}`);
      } else {
        console.log(
          WARN,
          `Portfolio ${currentPortfolio?.id} does not need update`
        );
      }
    })
  );
  console.log(INFO, `Updated  ${count} portfolios`);
  console.log(
    INFO,
    `No Updated ${portfoliosWithFunds.length - count} portfolios`
  );
  console.log(INFO, `Total portfolios: ${portfoliosWithFunds.length}`);
};

main();
