package com.github.domwood.kiwi.kafka.task.consumer;


import com.github.domwood.kiwi.data.input.AbstractConsumerRequest;
import com.github.domwood.kiwi.data.input.filter.MessageFilter;
import com.github.domwood.kiwi.data.output.*;
import com.github.domwood.kiwi.kafka.filters.FilterBuilder;
import com.github.domwood.kiwi.kafka.resources.KafkaConsumerResource;
import com.github.domwood.kiwi.kafka.task.ContinousFuturisingKafkaTask;
import com.github.domwood.kiwi.kafka.task.FuturisingKafkaTask;
import com.github.domwood.kiwi.kafka.task.KafkaTaskUtils;
import com.github.domwood.kiwi.kafka.utils.KafkaConsumerTracker;
import org.apache.kafka.clients.consumer.ConsumerRecord;
import org.apache.kafka.clients.consumer.ConsumerRecords;
import org.apache.kafka.clients.consumer.OffsetAndMetadata;
import org.apache.kafka.common.TopicPartition;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.time.Duration;
import java.util.*;
import java.util.function.Predicate;

import static com.github.domwood.kiwi.kafka.utils.KafkaUtils.fromKafkaHeaders;
import static java.time.temporal.ChronoUnit.MILLIS;
import static java.util.Collections.emptyList;
import static java.util.concurrent.TimeUnit.MILLISECONDS;

public class ContinuousConsumeMessages
        extends ContinousFuturisingKafkaTask<AbstractConsumerRequest, ConsumerResponse<String, String>, KafkaConsumerResource<String, String>> {

    private final Logger logger = LoggerFactory.getLogger(this.getClass());
    private static final Integer BATCH_SIZE = 100;
    private static final Integer MAX_MESSAGES = 500;
    private static final Integer MAX_MESSAGE_BYTES = 500 * 2000 * 16;

    private volatile List<MessageFilter> filters;

    public ContinuousConsumeMessages(KafkaConsumerResource<String, String> resource,
                                     AbstractConsumerRequest input) {
        super(resource, input);
        this.filters = emptyList();
    }

    @Override
    public void update(AbstractConsumerRequest input) {
        this.filters = input.filters();
    }

    @Override
    protected Void delegateExecuteSync() {
        this.filters = input.filters();

        try {
            KafkaConsumerTracker tracker = KafkaTaskUtils.subscribeAndSeek(resource, input.topics(), input.consumerStartPosition());

            forward(emptyList(), tracker.position(resource));

            int idleCount = 0;
            while (!this.isClosed()) {
                if (this.isPaused()) {
                    MILLISECONDS.sleep(20);
                } else {
                    ConsumerRecords<String, String> records = resource.poll(Duration.of(Integer.max(10 ^ (idleCount + 1), 5000), MILLIS));
                    if (records.isEmpty()) {
                        idleCount++;
                        logger.debug("No records polled for topic {} ", input.topics());
                        forward(emptyList(), tracker.position(resource));

                    } else {
                        idleCount = 0;
                        Predicate<ConsumerRecord<String, String>> filter = FilterBuilder.compileFilters(this.filters);
                        ArrayList<ConsumedMessage<String, String>> messages = new ArrayList<>(BATCH_SIZE);

                        Iterator<ConsumerRecord<String, String>> recordIterator = records.iterator();
                        Map<TopicPartition, OffsetAndMetadata> toCommit = new HashMap<>();
                        int totalBatchSize = 0;
                        while (recordIterator.hasNext() && !this.isClosed()) {
                            ConsumerRecord<String, String> record = recordIterator.next();
                            tracker.incrementRecordCount();


                            if (filter.test(record)) {
                                messages.add(asConsumedRecord(record));
                                toCommit.put(new TopicPartition(record.topic(), record.partition()), new OffsetAndMetadata(record.offset()));
                                totalBatchSize += Optional.ofNullable(record.value()).orElse("").length() * 16;
                            }

                            if (totalBatchSize >= MAX_MESSAGE_BYTES || messages.size() >= MAX_MESSAGES) {
                                forwardAndMaybeCommit(resource, messages, toCommit, tracker.position(resource));
                                totalBatchSize = 0;
                            }
                        }
                        forwardAndMaybeCommit(resource, messages, toCommit, tracker.position(resource));
                    }
                }
            }

            this.resource.unsubscribe();
        } catch (Exception e) {
            logger.error("Error occurred during continuous kafka consuming", e);
        }
        logger.info("Task has completed");
        return null;
    }

    private void logCommit(Map<TopicPartition, OffsetAndMetadata> offsetData, Exception exception) {
        if (exception != null) {
            logger.error("Failed to commit offset ", exception);
        } else {
            logger.debug("Commit offset data {}", offsetData);
        }
    }

    private ConsumedMessage<String, String> asConsumedRecord(ConsumerRecord<String, String> record) {
        return ImmutableConsumedMessage.<String, String>builder()
                .timestamp(record.timestamp())
                .offset(record.offset())
                .partition(record.partition())
                .key(record.key())
                .message(record.value())
                .headers(fromKafkaHeaders(record.headers()))
                .build();
    }

    private void forwardAndMaybeCommit(KafkaConsumerResource<String, String> resource,
                                       List<ConsumedMessage<String, String>> messages,
                                       Map<TopicPartition, OffsetAndMetadata> toCommit,
                                       ConsumerPosition position) {
        //Blocking Call
        logger.info("Message batch size {} forwarding to consumers", messages.size());

        if (!this.isClosed()) {
            forward(messages, position);

            if (resource.isCommittingConsumer()) {
                resource.commitAsync(toCommit, this::logCommit);
            }

            messages.clear();
            toCommit.clear();
        }
    }

    private void forward(List<ConsumedMessage<String, String>> messages,
                         ConsumerPosition position) {
        if (!this.isClosed()) {
            this.forward(ImmutableConsumerResponse.<String, String>builder()
                    .messages(messages)
                    .position(position)
                    .build());
        }
    }

}
